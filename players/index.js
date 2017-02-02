'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

const endEvents = [
	"touchdown",
	"tackle",
	"pass_outcome_incomplete", 
	"pass_outcome_interception", 
	"touchdown", 
	"qb_sack", 
	"pass_outcome_touchdown", 
	"qb_kneel", 
	"out_of_bounds", 
	"extra_point", 
	"extra_point_blocked", 
	"fair_catch", 
	"field_goal", 
	"field_goal_missed", 
	"field_goal_blocked", 
	"punt_downed", 
	"touchback", 
	"safety"
];

class Players {
	
	constructor() {
		this.keyEvents = [];
		this.trackY = [];
		this.trackX = [];
		this.keyEventHash = {};
		this.playerHash = {};	
	}

	init(stats, allTracking) {
		
		// get key players from stats object
		let keyPlayers = _(stats)
		.filter((stat) => {
			return stat.stat_type == 'pass' || stat.stat_type == 'receive' || stat.stat_type == 'rush' || stat.stat_type == 'defense';
		})
		.map((stat) => {
			this.playerHash[stat.player.reference] = stat.player;
			return stat.player.reference;
		})
		.value();


		// get relevant tracking data and capture key events and x/y for boundaries
		_.forEach(allTracking, (player) => {
			if (keyPlayers.indexOf(player.gsisId) !== -1) {
				let inPlay = false;
				
				// get tracking data from line set to end event, don't track QB after pass
				this.playerHash[player.gsisId].tracking = _.filter(player.playerTrackingData, (tracking) => {
					if (tracking.event && tracking.event == 'line_set') {
						inPlay = true;
					}

					if (inPlay) {
						if (tracking.event) {
							// keep all events and add to hash for post play drawing
							this.keyEvents.push(tracking.event);
							this.keyEventHash[tracking.event + '_' + this.playerHash[player.gsisId].position] = tracking;
						}

						// keep all x/y for later boundary calcs
						this.trackX.push(tracking.x);
						this.trackY.push(tracking.y);
					}

					if (tracking.event && (endEvents.indexOf(tracking.event) !== -1 || (this.playerHash[player.gsisId].position == "QB" && tracking.event == "pass_forward"))) {	
						inPlay = false;
					}

					return inPlay;
				});
			}
		});


	}

}

module.exports = Players;