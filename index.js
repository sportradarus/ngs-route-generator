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

const photoSize = 20;
const nameSize = 40;	// size of text box below photo for name 
const fieldConfig = {
	width: 120,
	height: 53.3,
	mag: 3
};


function checkBounds(field, centerX, centerY, offset) {
	let playerX = field.getX( centerX + offset );
	let playerY = field.getY( centerY ) - (photoSize / 2);
	let center = {
		x: field.getX(centerX),
		y: field.getY(centerY)
	};

	// adjust based on field bounds
	if (playerX < 0) {
		playerX = 0;
	}
	if (playerY < 0) {
		playerY = 0;
	}
	if (playerX + nameSize > field.fieldWidth) {
		playerX = field.fieldWidth - nameSize;
	}
	if (playerY + nameSize > field.fieldHeight) {
		playerY = field.fieldHeight - nameSize;
	}

	return {
		x: playerX,
		y: playerY
	};
}



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

		
		// draw player lines		
		_.forEach(players.players, (player) => {
			
			if (["QB","RB","WR","TE","FB"].indexOf(player.position) !== -1) {
				pdf.doc.strokeColor("#458B00");
			} else {
				pdf.doc.strokeColor("#333333");
				pdf.doc.strokeOpacity(0.8);
			}

			_.forEach(player.inPlayTracking.data, (tracking, index) => {
				if (!index) {
					pdf.doc.moveTo(field.getX(tracking.x), field.getY(tracking.y));
				} else {
					
					if (tracking.event == 'pass_outcome_caught' && player.reception) {
						pdf.doc.stroke();
						pdf.doc.strokeColor("#66CD00");
					}
					
					pdf.doc.lineTo(field.getX(tracking.x), field.getY(tracking.y));
				}
			});
			
			pdf.doc.stroke();
		});


		let statContext = event.clock + ', ' + moment().dayOfYear(event.start_situation.down).format('DDDo') + ' & ' + event.start_situation.yfd;
		if (event.period) {
			statContext = moment().dayOfYear(event.period).format('DDDo') + ' Quarter, ' + statContext;
		}


		// for passing completions, draw pass from QB to WR				
		if (event.play_type == 'pass' && players.events.indexOf('pass_forward') !== -1) {
			
			console.log()

			let qb = _.find(players.players, { 'position': 'QB' });
			let wr = _.find(players.players, { 'position': 'WR' });
			let te = _.find(players.players, { 'position': 'TE' });
			let rb = _.find(players.players, { 'position': 'RB' });
			let receiver = false;
			
			if (qb && (wr || te || rb)) {
				
				let passOutcome = 'pass_outcome_caught';
				if (players.events.indexOf('pass_outcome_touchdown') !== -1) {
					passOutcome = 'pass_outcome_touchdown';
				} else if (players.events.indexOf('pass_outcome_interception') !== -1) {
					passOutcome = 'pass_outcome_interception';
				} else if (players.events.indexOf('pass_outcome_incomplete') !== -1) {
					passOutcome = 'pass_outcome_incomplete';
				}

				pdf.doc.circle(
					field.getX( qb.inPlayTracking.events['pass_forward'].x ),
					field.getY( qb.inPlayTracking.events['pass_forward'].y ),
					2
				)
				.lineWidth(1)
				.fillAndStroke("#FFA500", "#ff9900");
				
				if (wr) {
					receiver = wr;
				} else if (te) {
					receiver = te;
				} else if (rb) {
					receiver = rb;
				}

				if (passOutcome == 'pass_outcome_incomplete' || passOutcome == 'pass_outcome_interception') {
					pdf.doc.circle(
						field.getX( receiver.inPlayTracking.events[passOutcome].x ), 
						field.getY( receiver.inPlayTracking.events[passOutcome].y ),
						3
					)
					.fill("black");
					pdf.doc.fontSize(6)
					.fillColor("red")
					.text('X', field.getX( receiver.inPlayTracking.events[passOutcome].x ) - 2, field.getY( receiver.inPlayTracking.events[passOutcome].y ) - 2);
				} else {
					pdf.doc.circle(
						field.getX( receiver.inPlayTracking.events[passOutcome].x ), 
						field.getY( receiver.inPlayTracking.events[passOutcome].y ),
						2
					)
					.lineWidth(1)
					.fillAndStroke("#FFA500", "#ff9900");
				}


				let topSpeed = Math.round(receiver.inPlayTracking.maxSpeed * 2.04545);
				if (passOutcome != 'pass_outcome_interception') {
				
					pdf.doc.circle(
						field.getX( receiver.inPlayTracking.events['top_speed'].x ), 
						field.getY( receiver.inPlayTracking.events['top_speed'].y ),
						4
					)
					.lineWidth(1)
					.fillAndStroke("white", "#ff0000");

					pdf.doc.fontSize(4)
					.fillColor("black")
					.text(topSpeed, field.getX( receiver.inPlayTracking.events['top_speed'].x ) - 4, field.getY( receiver.inPlayTracking.events['top_speed'].y ) - 1.5, { width: 8, align: 'center' } );
				}
				
				pdf.doc.fill('black');

				pdf.doc.moveTo(
					field.getX( qb.inPlayTracking.events['pass_forward'].x ), 
					field.getY( qb.inPlayTracking.events['pass_forward'].y )
				)
				.lineTo(
					field.getX( receiver.inPlayTracking.events[passOutcome].x ), 
					field.getY( receiver.inPlayTracking.events[passOutcome].y )
				)
				.dash(5, {space: 2})
				.strokeColor("#c30222")
				.stroke();

				
				let qbHeadX = 0;
				let qbHeadY = 0;
				let receiverHeadX = 0;
				let receiverHeadY = 0;
				let qbOffset = 5;
				let rOffset = -11;

				if (field.direction == 'right') {
					qbOffset = -8;
					rOffset = 6;
				}

				let qbAdjusted = checkBounds( field, qb.inPlayTracking.events['pass_forward'].x, qb.inPlayTracking.events['pass_forward'].y, qbOffset);	
				qbHeadX = qbAdjusted.x;
				qbHeadY = qbAdjusted.y;
				
				let rAdjusted = checkBounds( field, receiver.inPlayTracking.events[passOutcome].x, receiver.inPlayTracking.events[passOutcome].y, rOffset);
				receiverHeadX = rAdjusted.x;
				receiverHeadY = rAdjusted.y;
				

				let statPlacement = { width: (field.fieldWidth - 30), align: 'right'};
				if (receiver.inPlayTracking.events[passOutcome].x > 60) {
					statPlacement = { width: (field.fieldWidth - 30), align: 'left' };
				}

				let statDesc = qb.yards + ' yard';
				if (qb.touchdown) {
					statDesc += ' touchdown pass';
				} else if (qb.firstdown) {
					statDesc += ' completion for 1st down';
				} else if (passOutcome == 'pass_outcome_incomplete') {
					statDesc = 'Incomplete Pass';
				} else if (passOutcome == 'pass_outcome_interception') {
					statDesc = 'Interception';
				} else {
					statDesc += ' completion';
				}

				pdf.doc.image(base + qb.gsisId + '.png', qbHeadX, qbHeadY, { fit: [ photoSize, photoSize] })
				.fontSize(5)
				.text(qb.name, (qbHeadX + (photoSize / 2)) - (nameSize / 2), (qbHeadY + photoSize + 1), { width: nameSize, align: 'center'} )
				.image(base + receiver.gsisId + '.png', receiverHeadX, receiverHeadY, { fit: [photoSize, photoSize] })
				.text(receiver.name, (receiverHeadX + (photoSize/2)) - (nameSize / 2), (receiverHeadY + photoSize + 1), { width: nameSize, align: 'center'} )
				.moveDown(0.1)
				.fontSize(8)
				.text(statContext, 15, 5, statPlacement )	
				.moveDown(.2)
				.text(statDesc, statPlacement )	
				
			}

		}

		if (event.play_type == 'rush') {

			let rb = _.find(players.players, { 'position': 'RB' });
			let rushStart = false;
			let rushOutcome = 'tackle';
			if (rb.inPlayTracking.events.pass_lateral) {
				rushStart = 'pass_lateral';
			} else if (rb.inPlayTracking.events.handoff) {
				rushStart = 'handoff';
			}
			if (!rb.inPlayTracking.events.tackle && rb.inPlayTracking.events.out_of_bounds) {
				rushOutcome = 'out_of_bounds';
			} else if (!rb.inPlayTracking.events.tackle && rb.inPlayTracking.events.touchdown) {
				rushOutcome = 'touchdown';
			}

			pdf.doc.circle(
				field.getX( rb.inPlayTracking.events[rushStart].x ), 
				field.getY( rb.inPlayTracking.events[rushStart].y ),
				2
			)
			.lineWidth(1)
			.fillAndStroke("#FFA500", "#ff9900");

			let topSpeed = Math.round(rb.inPlayTracking.maxSpeed * 2.04545);

			pdf.doc.circle(
				field.getX( rb.inPlayTracking.events['top_speed'].x ), 
				field.getY( rb.inPlayTracking.events['top_speed'].y ),
				4
			)
			.lineWidth(1)
			.fillAndStroke("white", "#ff0000");

			pdf.doc.fontSize(4)
			.fillColor("black")
			.text(topSpeed, field.getX( rb.inPlayTracking.events['top_speed'].x ) - 4, field.getY( rb.inPlayTracking.events['top_speed'].y ) - 1.5, { width: 8, align: 'center' } );
			
			if (rb.inPlayTracking.events.tackle) {
				pdf.doc.circle(
					field.getX( rb.inPlayTracking.events['tackle'].x ), 
					field.getY( rb.inPlayTracking.events['tackle'].y ),
					4
				)
				.fill("#ff9900");
			}

			pdf.doc.fill("black");

			let rbHeadX = 0;
			let rbHeadY = 0;
			let rbOffset = 5;
			
			if (field.direction == 'right') {
				rbOffset = -8;
			}

			let rbAdjusted = checkBounds( field, rb.inPlayTracking.events[rushStart].x, rb.inPlayTracking.events[rushStart].y, rbOffset);	
			rbHeadX = rbAdjusted.x;
			rbHeadY = rbAdjusted.y;

			let statPlacement = { width: (field.fieldWidth - 30), align: 'right'};
			if (rb.inPlayTracking.events[rushOutcome].x > 60) {
				statPlacement = { width: (field.fieldWidth - 30), align: 'left' };
			}

			let statDesc = rb.yards + ' yard';
			if (rb.touchdown) {
				statDesc += ' touchdown rush';
			} else if (rb.firstdown) {
				statDesc += ' rush for 1st down';
			} else {
				statDesc += ' rush';
			}

			pdf.doc.image(base + rb.gsisId + '.png', rbHeadX, rbHeadY, { fit: [ photoSize, photoSize] })
			.fontSize(5)
			.text(rb.name, (rbHeadX + (photoSize / 2)) - (nameSize / 2), (rbHeadY + photoSize + 1), { width: nameSize, align: 'center'} )
			.fontSize(8)
			.text(statContext, 15, 5, statPlacement )	
			.moveDown(.2)
			.text(statDesc, statPlacement )	

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
