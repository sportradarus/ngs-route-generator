'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

// modules
const Headshots = require('./head-shots');

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

class Player extends Headshots {
	
	constructor(stat) {
		super();
		this.srusId = stat.player.id;
		this.gsisId = stat.player.reference;
		this.position = stat.player.position;
		this.name = stat.player.name;
		this.jersey = stat.player.jersey;
		this.headshot = this.getHeadshot(this.srusId);
		this.yards = stat.yards;
		this.touchdown = stat.touchdown;
		this.firstdown = stat.firstdown;
		this.tracking = {
			data: [],
			events: {},
			xMax: 0,
			yMax: 0,
			xMin: 0,
			yMin: 0
		};
		this.inPlayTracking = {
			data: [],
			events: {},
			xMax: 0,
			yMax: 0,
			xMin: 0,
			yMin: 0
		};
	}

	setTracking(tracking) {
		this.tracking.data = tracking;
		
		_.forEach(this.tracking.data, (t) => {
			if (t.event) {
				this.tracking.events[t.event] = t;
			}
			if (t.x > this.tracking.xMax) {
				this.tracking.xMax = t.x;
			}
			if (t.y > this.tracking.yMax) {
				this.tracking.yMax = t.y;
			}
			if (t.x < this.tracking.xMin) {
				this.tracking.xMin = t.x;
			}
			if (t.y < this.tracking.yMin) {
				this.tracking.yMin = t.y;
			}
		});
	}

	setInPlayTracking() {

		let inPlay = false;
		
		this.inPlayTracking.data = _.filter(this.tracking.data, (t) => {
			
			if (t.event && t.event == 'line_set') {
				inPlay = true;
			}

			if (inPlay) {
				if (t.event) {
					this.inPlayTracking.events[t.event] = t;
				}

				if (t.x > this.inPlayTracking.xMax) {
					this.inPlayTracking.xMax = t.x;
				}
				if (t.y > this.inPlayTracking.yMax) {
					this.inPlayTracking.yMax = t.y;
				}
				if (t.x < this.inPlayTracking.xMin) {
					this.inPlayTracking.xMin = t.x;
				}
				if (t.y < this.inPlayTracking.yMin) {
					this.inPlayTracking.yMin = t.y;
				}
			}

			if (t.event && (endEvents.indexOf(t.event) !== -1 || (this.position == "QB" && t.event == "pass_forward"))) {	
				inPlay = false;
			}

			return inPlay;
		});
			
	}

}

module.exports = Player;