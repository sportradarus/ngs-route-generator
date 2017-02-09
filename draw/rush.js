'use strict';

const _ = require('lodash');
const Base = require('./base');


class Rush extends Base {
	
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

		let rb = _.find(this.players, { 'position': 'RB' });
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

		this.doc.circle(
			this.field.getX( rb.inPlayTracking.events[rushStart].x ), 
			this.field.getY( rb.inPlayTracking.events[rushStart].y ),
			2
		)
		.lineWidth(1)
		.fillAndStroke("#FFA500", "#ff9900");

		
		//===========================================
		let topSpeed = Math.round(rb.inPlayTracking.maxSpeed * 2.04545);

		this.doc.circle(
			this.field.getX( rb.inPlayTracking.events['top_speed'].x ), 
			this.field.getY( rb.inPlayTracking.events['top_speed'].y ),
			4
		)
		.lineWidth(1)
		.fillAndStroke("white", "#ff0000");

		this.doc.fontSize(4)
		.fillColor("black")
		.text(topSpeed, this.field.getX( rb.inPlayTracking.events['top_speed'].x ) - 4, this.field.getY( rb.inPlayTracking.events['top_speed'].y ) - 1.5, { width: 8, align: 'center' } );
		//===========================================


		if (rb.inPlayTracking.events.tackle) {
			this.doc.circle(
				this.field.getX( rb.inPlayTracking.events['tackle'].x ), 
				this.field.getY( rb.inPlayTracking.events['tackle'].y ),
				4
			)
			.fill("#ff9900");
		}

		this.doc.fill("black");

		let rbHeadX = 0;
		let rbHeadY = 0;
		let rbOffset = 5;
		
		if (this.field.direction == 'right') {
			rbOffset = -8;
		}

		let rbAdjusted = this.checkBounds( rb.inPlayTracking.events[rushStart].x, rb.inPlayTracking.events[rushStart].y, rbOffset);	
		rbHeadX = rbAdjusted.x;
		rbHeadY = rbAdjusted.y;

		
		// get play quarter and clock
		this.setStatContext(this.event, rb.inPlayTracking.events[rushOutcome]);


		let statDesc = rb.yards + ' yard';
		if (rb.touchdown) {
			statDesc += ' touchdown rush';
		} else if (rb.firstdown) {
			statDesc += ' rush for 1st down';
		} else {
			statDesc += ' rush';
		}

		this.doc.image(this.base + rb.gsisId + '.png', rbHeadX, rbHeadY, { fit: [ this.photoSize, this.photoSize] })
		.fontSize(5)
		.text(rb.name, (rbHeadX + (this.photoSize / 2)) - (this.nameSize / 2), (rbHeadY + this.photoSize + 1), { width: this.nameSize, align: 'center'} )
		.fontSize(8)
		.text(this.statContext, (this.field.mag * 12), 5, this.statPlacement )
		.moveDown(.2)
		.text(statDesc, this.statPlacement);	

	}

}

module.exports = Rush;