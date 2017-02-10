'use strict';

const _ = require('lodash');
const Base = require('./base');


class Sack extends Base {
	
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

		let qb = _.find(this.players, { 'position': 'QB' });
		let sacker = _.find(this.players, { 'statType': 'defense', 'sack': 1 });
		
		if (!qb) {
			console.log('no qb');
			return;	// no qb, bail
		}
		
		let qbHeadX = 0;
		let qbHeadY = 0;
		let qbOffset = 5;
		let sHeadX = 0;
		let sHeadY = 0;
		let sOffset = -11;
		let statDesc = 'Sacked for ' + Math.abs(qb.sackYards) + ' yard loss';

		if (this.field.direction == 'right') {
			qbOffset = -8;
			sOffset = 6;
		}
		
		let sackEvent;
		if (qb.inPlayTracking.events.qb_sack) {
			sackEvent = 'qb_sack';
		} else {
			sackEvent = 'tackle';
		}

		
		this.doc.circle(
			this.field.getX( qb.inPlayTracking.events[sackEvent].x ), 
			this.field.getY( qb.inPlayTracking.events[sackEvent].y ),
			3
		)
		.fill("red")
		.fill("black");
		
		

		
				
		let qbAdjusted = this.checkBounds( qb.inPlayTracking.events[sackEvent].x, qb.inPlayTracking.events[sackEvent].y, qbOffset);	
		qbHeadX = qbAdjusted.x;
		qbHeadY = qbAdjusted.y;

		let sAdjusted = this.checkBounds( sacker.inPlayTracking.events['line_set'].x, sacker.inPlayTracking.events['line_set'].y, sOffset);	
		sHeadX = sAdjusted.x;
		sHeadY = sAdjusted.y;
		
		
		
		// get play quarter and clock
		this.setStatContext(this.event, qb.inPlayTracking.events[sackEvent]);
		

		
		this.doc.image(this.base + qb.gsisId + '.png', qbHeadX, qbHeadY, { fit: [ this.photoSize, this.photoSize] })
		.fontSize(5)
		.text(qb.name, (qbHeadX + (this.photoSize / 2)) - (this.nameSize / 2), (qbHeadY + this.photoSize + 1), { width: this.nameSize, align: 'center'} );

		this.doc.image(this.base + sacker.gsisId + '.png', sHeadX, sHeadY, { fit: [ this.photoSize, this.photoSize] })
		.fontSize(5)
		.text(sacker.name, (sHeadX + (this.photoSize / 2)) - (this.nameSize / 2), (sHeadY + this.photoSize + 1), { width: this.nameSize, align: 'center'} );
		
		
		this.doc.fontSize(8)
		.text(this.statContext, (this.field.mag * 12), 5, this.statPlacement)
		.moveDown(.2)
		.text(statDesc, this.statPlacement );
				
	}

}

module.exports = Sack;