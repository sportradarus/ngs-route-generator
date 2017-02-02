var Promise = require('bluebird');
var UUID = require('uuid-1345');

var headShotPath = '/head-shots/';

function generateKey(playerId) {

	if(!playerId) {
		return Promise.resolve();
	}
	
	return new Promise(function(fulfill, reject) {
		UUID.v5({
			namespace: playerId,
			name: process.env.SR_HEADSHOT_FILE_KEY
		}, function (err, result) {
			if(err) {
				return reject(err);
			}
			return fulfill(result);
		});
	});

}

function getHeadshot(srusPlayerId) {
	return generateKey(srusPlayerId)
	.then(function(key) {
		return process.env.AWS_NGS_BUCKET + headShotPath + key + '.png';
	});
}

module.exports = {
	getHeadshot: getHeadshot
};