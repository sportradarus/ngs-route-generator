'use strict';

const _ = require('lodash');
const Base = require('./base');


class PuntKick extends Base {
	
	constructor(pdf, field, event, baseDir, players) {
		if (!pdf) {
			throw new Error('no pdf reference passed to field');
		}
		super(pdf, field, baseDir, players);
		this.event = event;
	}

	
	draw() {

		// draw base lines for all key players
		this.lines();

		let kicker = _.find(this.players, { 'position': 'K' });
		let punter = _.find(this.players, { 'position': 'P' });
		let returner = _.find(this.players, { 'statType': 'return' });
		
		if (!kicker && !punter) {
			console.log('no kicker or punter');
			return;
		}
		
		let kickEvent = 'kickoff';
		let kickOutcome = '';
		let kpHeadX = 0;
		let kpHeadY = 0;
		let returnHeadX = 0;
		let returnHeadY = 0;
		let kpOffset = 5;
		let returnOffset = -11;

		if (this.field.direction == 'right') {
			kpOffset = -8;
			returnOffset = 6;
		}
		
		let statDesc = "Kickoff";

		if (!kicker && punter) {
			kicker = punter;
		}

		if (kicker.inPlayTracking.events.punt) {
			kickEvent = 'punt';
			kickOutcome = 'punt_received';
			statDesc = "Punt";
		}

		if (kicker.inPlayTracking.events.kick_received) {
			kickOutcome = 'kick_received';
		} else if (kicker.inPlayTracking.events.punt_received) {
			kickOutcome = 'punt_received';
		} else if (kicker.inPlayTracking.events.touchback) {
			kickOutcome = 'touchback';
		} else if (kicker.inPlayTracking.events.fair_catch) {
			kickOutcome = 'fair_catch';
		} else {
			console.log('no kick outcome found');
			return;
		}

		
		// draw circle indicating kick event
		this.doc.circle(
			this.field.getX( kicker.inPlayTracking.events[kickEvent].x ),
			this.field.getY( kicker.inPlayTracking.events[kickEvent].y ),
			2
		)
		.lineWidth(1)
		.fillAndStroke("#FFA500", "#ff9900");
		
		
		if (kickOutcome == 'kick_received') {
			// draw topSpeed circle, this should be above outcome drawing, to ensure priority and overwriting
			this.topSpeed(returner);
		}

		
		this.doc.circle(
			this.field.getX( returner.inPlayTracking.events[kickOutcome].x ), 
			this.field.getY( returner.inPlayTracking.events[kickOutcome].y ),
			2
		)
		.lineWidth(1)
		.fillAndStroke("#FFA500", "#ff9900")
		.fillColor("black");
		

		let tackleEvent;
		if (returner.inPlayTracking.events.out_of_bounds) {
			tackleEvent = 'out_of_bounds';
		} else if (returner.inPlayTracking.events.tackle) {
			tackleEvent = 'tackle';
		}

		if (tackleEvent) {
			this.doc.circle(
				this.field.getX( returner.inPlayTracking.events[tackleEvent].x ), 
				this.field.getY( returner.inPlayTracking.events[tackleEvent].y ),
				2
			)
			.fill("black");
		}
		
		
		
		
				
		// draw kick line
		this.doc.moveTo(
			this.field.getX( kicker.inPlayTracking.events[kickEvent].x ), 
			this.field.getY( kicker.inPlayTracking.events[kickEvent].y )
		)
		.lineTo(
			this.field.getX( returner.inPlayTracking.events[kickOutcome].x ), 
			this.field.getY( returner.inPlayTracking.events[kickOutcome].y )
		)
		.dash(5, {space: 2})
		.strokeColor("#c30222")
		.stroke();
				

				
		let kpAdjusted = this.checkBounds( kicker.inPlayTracking.events[kickEvent].x, kicker.inPlayTracking.events[kickEvent].y, kpOffset);	
		kpHeadX = kpAdjusted.x;
		kpHeadY = kpAdjusted.y;
		
		
		let rAdjusted = this.checkBounds( returner.inPlayTracking.events[kickOutcome].x, returner.inPlayTracking.events[kickOutcome].y, returnOffset);
		returnHeadX = rAdjusted.x;
		returnHeadY = rAdjusted.y;
		

		// get play quarter and clock
		this.setStatContext(this.event, returner.inPlayTracking.events[kickOutcome]);
		

		
		this.doc.image(this.base + kicker.gsisId + '.png', kpHeadX, kpHeadY, { fit: [ this.photoSize, this.photoSize] })
		.fontSize(5)
		.text(kicker.name, (kpHeadX + (this.photoSize / 2)) - (this.nameSize / 2), (kpHeadY + this.photoSize + 1), { width: this.nameSize, align: 'center'} );
		
		this.doc.image(this.base + returner.gsisId + '.png', returnHeadX, returnHeadY, { fit: [this.photoSize, this.photoSize] })
		.text(returner.name, (returnHeadX + (this.photoSize/2)) - (this.nameSize / 2), (returnHeadY + this.photoSize + 1), { width: this.nameSize, align: 'center'} );
		
		this.doc.fontSize(8)
		.text(this.statContext, (this.field.mag * 12), 5, this.statPlacement)
		.moveDown(.2)
		.text(statDesc, this.statPlacement );
				
	}

}

module.exports = PuntKick;