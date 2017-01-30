var Promise = require('bluebird');
var _ = require('lodash');
var AWS = require('aws-sdk');
var moment = require('moment');
var fs = require('fs');
var spawn = require('child_process').spawn;
var pdfkit = require('pdfkit');


// modules
var S3 = require('../common').s3;


var endEvents = ["touchdown", "tackle", "pass_outcome_incomplete", "pass_outcome_interception", "touchdown", "qb_sack", "pass_outcome_touchdown", "qb_kneel", "out_of_bounds", "extra_point", "extra_point_blocked", "fair_catch", "field_goal", "field_goal_missed", "field_goal_blocked", "punt_downed", "touchback", "safety"];
var xRatio = 120;
var yRatio = 53.3;
var zoom = 3;

function getX(x) {
	return x * zoom;	
}
function getY(y) {
	return (yRatio * zoom) - (y * zoom);	
}

exports.handler = function(event, context, callback) {

	console.log(event.gsisGameId + '-' + event.reference + '.json');
	
	var ngsFile = event.gsisGameId + '-' + event.reference + '.json';
	var pdfFile = '/tmp/' + event.gsisGameId + '-' + event.reference + '.pdf';
	var pngFileName = event.gsisGameId + '-' + event.reference + '.png';
	var pngFile = '/tmp/' + pngFileName;

	return S3.checkForFile(process.env.BUCKET_ROUTES, pngFileName)
	.then(function(exists) {
		if (exists) {
			return callback(null, {
				url: 'https://s3-us-west-2.amazonaws.com/' + process.env.BUCKET_ROUTES + '/' + pngFileName
			});
		}
		return S3.getJSONFile(process.env.BUCKET_HARVESTED, ngsFile)
		.then(function(file) {
			
			var playerHash = {};
			
			var keyPlayers = _(event.statistics)
			.filter(function(stat) {
				return stat.stat_type == 'pass' || stat.stat_type == 'receive' || stat.stat_type == 'rush' || stat.stat_type == 'defense';
			})
			.map(function(stat) {
				playerHash[stat.player.reference] = stat.player;
				return stat.player.reference;
			})
			.value();

			var allTracking = file.homeTrackingData.concat(file.awayTrackingData);
			var keyPlayerTracking = _.filter(allTracking, function(player) {
				if (keyPlayers.indexOf(player.gsisId) !== -1) {
					return true;
				}
				return false;
			});

			return new Promise(function(resolve, reject) {
				
				var doc = new pdfkit();
				var s = doc.pipe(fs.createWriteStream(pdfFile));

				var scrimmage = getX(event.start_situation.location.yardline + 10);
				doc.moveTo( scrimmage, 0)
				.lineTo(scrimmage, (yRatio * zoom))
				.stroke();
				
				var keyEventHash = {};
				var keyEvents = [];

				_.forEach(keyPlayerTracking, function(player) {
					var inPlay = false;
					_.forEach(player.playerTrackingData, function(tracking) {
						if (tracking.event && tracking.event == 'line_set') {
							inPlay = true;
							doc.moveTo(getX(tracking.x), getY(tracking.y));
						} else if (tracking.event && (endEvents.indexOf(tracking.event) !== -1 || (playerHash[player.gsisId].position == "QB" && tracking.event == "pass_forward"))) {
							keyEventHash[tracking.event + '_' + playerHash[player.gsisId].position] = tracking;
							inPlay = false;
						}
						if (inPlay) {
							if (tracking.event) {
								keyEvents.push(tracking.event);
								keyEventHash[tracking.event + '_' + playerHash[player.gsisId].position] = tracking;
							}
							doc.lineTo(getX(tracking.x), getY(tracking.y));
						}
					});
					if (["QB","RB","WR","TE","FB"].indexOf(playerHash[player.gsisId].position) !== -1) {
						doc.strokeColor("green");
					} else {
						doc.strokeColor("#333333");
						doc.strokeOpacity(0.8);
					}
					doc.stroke();
				});

				
				if (keyEvents.indexOf('pass_forward') !== -1 && keyEvents.indexOf('pass_outcome_caught') !== -1) {
					
					doc.circle(getX(keyEventHash.pass_forward_QB.x), getY(keyEventHash.pass_forward_QB.y), 2);
					doc.circle(getX(keyEventHash.pass_outcome_caught_WR.x), getY(keyEventHash.pass_outcome_caught_WR.y), 2);
					
					doc.moveTo(getX(keyEventHash.pass_forward_QB.x), getY(keyEventHash.pass_forward_QB.y))
					.lineTo(getX(keyEventHash.pass_outcome_caught_WR.x), getY(keyEventHash.pass_outcome_caught_WR.y))
					.dash(5, {space: 2})
					.strokeColor("#c30222")
					.stroke();
				
				}

				s.on('finish', function() {
					console.log('done streaming');
					resolve();
				});
				doc.end();
			});
			
		})
		.then(function() {
			return new Promise(function(resolve, reject) {
				var conversion = spawn('convert', ['-density', '500', pdfFile, '-resize', '50%', '-trim', '-bordercolor', 'none', '-border', '10x10', pngFile], {'env': process.env});
				conversion.stdout.on('data', function (data) {
					console.log(data);
				});
				conversion.stderr.on('data', function (data) {
					console.log("convert stderr: \t" + data);
					reject(data);
				});
				conversion.on('error', function (data) {
					console.log('convert on error data: ', data);
					conversion.kill();
					reject(data);
				});
				conversion.on('exit', function (code) {
					conversion.kill();
					resolve();
				});
			});
		})
		.then(function() {
			return S3.upload(process.env.BUCKET_ROUTES, pngFile, pngFileName);
		})
		.then(function() {
			return callback(null, {
				url: 'https://s3-us-west-2.amazonaws.com/' + process.env.BUCKET_ROUTES + '/' + event.gsisGameId + '-' + event.reference + '.png'
			});
		});
	})
	.catch(function(err) {
		console.log(err);
		callback(err);
	});
	
};
