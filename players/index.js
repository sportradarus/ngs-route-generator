'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

// modules
const Player = require('./player');


class Players {
	
	constructor(stats, allTracking) {
		this.xMax = 0;
		this.yMax = 0;
		this.xMin = 0;
		this.yMin = 0;
		this.players = [];
		this.events = [];

		this.init(stats, allTracking);
	}

	init(stats, allTracking) {
		
		this.players = _(stats)
		.filter((stat) => {
			return stat.stat_type == 'pass' || stat.stat_type == 'receive' || stat.stat_type == 'rush' || stat.stat_type == 'defense' || stat.stat_type == 'kick' || stat.stat_type == 'punt' || (stat.stat_type == 'return' && stat.player);
		})
		.map((stat) => {
			return new Player(stat);
		})
		.keyBy('gsisId')
		.value();

		
		var keyPlayerIds = _.map(this.players, 'gsisId');

		_.forEach(allTracking, (ngsPlayerTracking) => {
			
			// filter out non-key players (all players are in allTracking array)
			if (keyPlayerIds.indexOf(ngsPlayerTracking.gsisId) === -1) {
				return;
			}
			
			
			var current = this.players[ ngsPlayerTracking.gsisId ];

			// set player tracking
			current.setTracking( ngsPlayerTracking.playerTrackingData );

			// whittle down tracking to just in play
			current.setInPlayTracking();


			// track max and min values
			if (current.inPlayTracking.xMax > this.xMax) {
				this.xMax = current.inPlayTracking.xMax;
			}
			if (current.inPlayTracking.yMax > this.yMax) {
				this.yMax = current.inPlayTracking.yMax;
			}
			if (current.inPlayTracking.xMin < this.xMin) {
				this.xMin = current.inPlayTracking.xMin;
			}
			if (current.inPlayTracking.yMin < this.yMin) {
				this.yMin = current.inPlayTracking.yMin;
			}

			// track events
			var evts = _.keys(current.inPlayTracking.events);
			this.events = _.uniq( this.events.concat( evts ));

		});

	}

}

module.exports = Players;