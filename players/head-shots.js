'use strict';

const _ = require('lodash');
const UUID = require('uuid-1345');

const headShotPath = '/head-shots/';

class HeadShots {
	
	constructor() {
		
	}

	generateKey(playerId) {

		if(!playerId) {
			return Promise.resolve();
		}
		
		return UUID.v5({
			namespace: playerId,
			name: process.env.SR_HEADSHOT_FILE_KEY
		});

	}

	getHeadshot(srusPlayerId) {
		return headShotPath + this.generateKey(srusPlayerId) + '.png';
	}

}

module.exports = HeadShots;