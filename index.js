'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const AWS = require('aws-sdk');



// modules
const S3 = require('./common').s3;
const PDF = require('./common').pdf;
const PNG = require('./common').png;
const Field = require('./field');
const Players = require('./players');


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
		
		let pdf = new PDF(pdfFile);
		let field = new Field(pdf, fieldConfig);
		var players = new Players();

		
		field.getAbsYardline(file);
		players.init(event.statistics, file.homeTrackingData.concat(file.awayTrackingData));

		
		return new Promise( (resolve, reject) => {
			
			
			_.forEach(players.playerHash, (player) => {
				_.forEach(player.tracking, (tracking, index) => {
					if (!index) {
						pdf.doc.moveTo(field.getX(tracking.x), field.getY(tracking.y));
					} else {
						pdf.doc.lineTo(field.getX(tracking.x), field.getY(tracking.y));
					}
				});
				if (["QB","RB","WR","TE","FB"].indexOf(player.position) !== -1) {
					pdf.doc.strokeColor("green");
				} else {
					pdf.doc.strokeColor("#333333");
					pdf.doc.strokeOpacity(0.8);
				}
				pdf.doc.stroke();
			});


			
			// for passing completions, draw pass from QB to WR				
			if (players.keyEvents.indexOf('pass_forward') !== -1 && players.keyEvents.indexOf('pass_outcome_caught') !== -1) {
				
				pdf.doc.circle(
					field.getX(players.keyEventHash.pass_forward_QB.x),
					field.getY(players.keyEventHash.pass_forward_QB.y),
					2
				);
				
				let receivePos = '';
				if (players.keyEventHash.pass_outcome_caught_WR) {
					receivePos = 'WR';
				} else if (players.keyEventHash.pass_outcome_caught_TE) {
					receivePos = 'TE';
				} else if (players.keyEventHash.pass_outcome_caught_RB) {
					receivePos = 'RB';
				}

				if (receivePos) {
					pdf.doc.circle(
						field.getX(players.keyEventHash['pass_outcome_caught_' + receivePos].x), 
						field.getY(players.keyEventHash['pass_outcome_caught_' + receivePos].y),
						2
					);
					
					pdf.doc.moveTo(
						field.getX(players.keyEventHash.pass_forward_QB.x), 
						field.getY(players.keyEventHash.pass_forward_QB.y)
					)
					.lineTo(
						field.getX(players.keyEventHash['pass_outcome_caught_' + receivePos].x), 
						field.getY(players.keyEventHash['pass_outcome_caught_' + receivePos].y)
					)
					.dash(5, {space: 2})
					.strokeColor("#c30222")
					.stroke();
				}
				
			}

			field.drawField();
			field.drawScrimmage();
			
			pdf.docStream.on('finish', () => {
				console.log('done streaming');
				resolve();
			});
			pdf.doc.end();

		});
	
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
		return callback(null, {
			url: 'https://s3-us-west-2.amazonaws.com/' + process.env.BUCKET_ROUTES + '/' + event.gsisGameId + '-' + event.reference + '.png'
		});
	})
	.catch((err) => {
		console.log(err);
		callback(err);
	});
	
};
