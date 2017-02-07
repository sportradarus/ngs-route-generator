'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const AWS = require('aws-sdk');
const request = require('request');
const fs = require('fs');


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

		
		// draw player lines		
		_.forEach(players.players, (player) => {
			_.forEach(player.inPlayTracking.data, (tracking, index) => {
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
		if (players.events.indexOf('pass_forward') !== -1 && players.events.indexOf('pass_outcome_caught') !== -1) {
			
			let qb = _.find(players.players, { 'position': 'QB' });
			let wr = _.find(players.players, { 'position': 'WR' });
			let te = _.find(players.players, { 'position': 'TE' });
			let rb = _.find(players.players, { 'position': 'RB' });
			let receiver = false;
			
			if (qb && (wr || te || rb)) {
				
				pdf.doc.circle(
					field.getX( qb.inPlayTracking.events['pass_forward'].x ),
					field.getY( qb.inPlayTracking.events['pass_forward'].y ),
					2
				);
			
				if (wr) {
					receiver = wr;
				} else if (te) {
					receiver = te;
				} else if (rb) {
					receiver = rb;
				}

				pdf.doc.circle(
					field.getX( receiver.inPlayTracking.events['pass_outcome_caught'].x ), 
					field.getY( receiver.inPlayTracking.events['pass_outcome_caught'].y ),
					2
				);
				
				pdf.doc.moveTo(
					field.getX( qb.inPlayTracking.events['pass_forward'].x ), 
					field.getY( qb.inPlayTracking.events['pass_forward'].y )
				)
				.lineTo(
					field.getX( receiver.inPlayTracking.events['pass_outcome_caught'].x ), 
					field.getY( receiver.inPlayTracking.events['pass_outcome_caught'].y )
				)
				.dash(5, {space: 2})
				.strokeColor("#c30222")
				.stroke();

				
				pdf.doc.image(base + qb.gsisId + '.png', 5, 5, { fit: [20, 20] })
				.fontSize(5)
				.text(qb.name, 5, 25, { width: 75, align: 'center'} )
				.image(base + receiver.gsisId + '.png', 5, 35, { fit: [20, 20] })
				.text(receiver.name, 5, 55, { width: 75, align: 'center'} )
				
			}

			
		}

		field.drawField();
		field.drawScrimmage();
		
		
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
