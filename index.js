'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const AWS = require('aws-sdk');
const request = require('request');
const moment = require('moment');
const fs = require('fs');


// modules
const S3 = require('./common').s3;
const PDF = require('./common').pdf;
const PNG = require('./common').png;
const Field = require('./field');
const Players = require('./players');
const Draw = require('./draw');

const fieldConfig = {
	width: 120,
	height: 53.3,
	mag: 3
};






exports.handler = function(event, context, callback) {

	console.log(event.gsisGameId + '-' + event.reference + '.json');
	
	let base = '/tmp/';
	if (process.env.NODE_ENV == 'local') {
		base = './';
	}

	const ngsFile = event.gsisGameId + '-' + event.reference + '.json';
	const pdfFile = base + event.gsisGameId + '-' + event.reference + '.pdf';
	const pngFileName = event.gsisGameId + '-' + event.reference + '.png';
	const pngFile = base + pngFileName;


	let pdf = new PDF(pdfFile);
	let field = new Field(pdf, fieldConfig);
	let players = [];
	


	return S3.checkForFile(process.env.BUCKET_ROUTES, pngFileName)
	.then((exists) => {
		if (exists && process.env.NODE_ENV != 'local') {
			// if file has already been generated, return reference.
			return callback(null, {
				url: 'https://s3-us-west-2.amazonaws.com/' + process.env.BUCKET_ROUTES + '/' + pngFileName
			});
		}

		// get NGS tracking file
		return S3.getJSONFile(process.env.BUCKET_HARVESTED, ngsFile);
	})
	.then((file) => {
		
		field.getAbsYardline(file);
		players = new Players(event.statistics, file.homeTrackingData.concat(file.awayTrackingData));

		field.drawField();
		field.drawScrimmage();


		// download player headshots (png needs to be local to add to pdf)
		var promises = [];
		_.forEach(players.players, (player) => {
			promises.push(new Promise((resolve, reject) => {
				var w = request('http://d24qad4ypyesj7.cloudfront.net' + player.headshot)
				.on('error', (error) => {
					reject(error);
				})
				.pipe(fs.createWriteStream(base + player.gsisId + '.png'));

				w.on('finish', () => {
        			resolve();
				});
			}));
		});

		return Promise.all(promises);

	})
	.then(() => {

		console.log('Play Type: ' + event.play_type);

		// for passing completions, draw pass from QB to WR				
		if (event.play_type == 'pass') {
			
			let qb = _.find(players.players, { 'position': 'QB' });
			if (qb.inPlayTracking.events.qb_sack) {
				var sack = new Draw.Sack(pdf, field, event, base, players);
				sack.draw();
			} else {
				var pass = new Draw.Pass(pdf, field, event, base, players);
				pass.draw();
			}
		
		} else if (event.play_type == 'rush') {
			
			var rush = new Draw.Rush(pdf, field, event, base, players);
			rush.draw();
		
		} else if (event.play_type == 'kickoff' || event.play_type == 'punt') {

			var puntKick = new Draw.PuntKick(pdf, field, event, base, players);
			puntKick.draw();

		}	

		pdf.docStream.on('finish', () => {
			console.log('done streaming');
			Promise.resolve();
		});

		pdf.doc.end();


	})
	.then(() => {
		let png = new PNG();
		return png.convert(pdfFile, pngFile);
	})
	.then(() => {
		if (process.env.NODE_ENV != 'local') {
			// upload 
			return S3.upload(process.env.BUCKET_ROUTES, pngFile, pngFileName);
		}
		return Promise.resolve();
	})
	.then(() => {
		var promises = [
			new Promise((resolve, reject) => {
				fs.unlink(pdfFile, (err) => {
					if (err) {
						return reject(err);
					}
					resolve();
				});
			})
		];
		_.forEach(players.players, (player) => {
			promises.push(new Promise((resolve, reject) => {
				fs.unlink(base + player.gsisId + '.png', (err) => {
					if (err) {
						return reject(err);
					}
					resolve();
				});
			}));
		});
		return Promise.all(promises);
	})
	.then(() => {
		return callback(null, {
			url: 'https://s3-us-west-2.amazonaws.com/' + process.env.BUCKET_ROUTES + '/' + event.gsisGameId + '-' + event.reference + '.png'
		});
	})
	.catch((err) => {
		console.log(err);
		callback(err);
	});
	
};
