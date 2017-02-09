'use strict';

const _ = require('lodash');
const Base = require('./base');


class Pass extends Base {
	
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
		let wr = _.find(this.players, { 'position': 'WR' });
		let te = _.find(this.players, { 'position': 'TE' });
		let rb = _.find(this.players, { 'position': 'RB' });
		let receiver = false;

		if (!qb) {
			console.log('no qb');
			return;	// no qb, bail
		}
		if (!qb.inPlayTracking.events.pass_forward) {
			console.log('no pass_forward event');
			return;	// no pass_forward event, bail
		}

		if (wr) {
			receiver = wr;
		} else if (te) {
			receiver = te;
		} else if (rb) {
			receiver = rb;
		} else {
			console.log('no receiver');
			return;	// no receiver, bail
		}

		let qbHeadX = 0;
		let qbHeadY = 0;
		let receiverHeadX = 0;
		let receiverHeadY = 0;
		let qbOffset = 5;
		let rOffset = -11;

		if (this.field.direction == 'right') {
			qbOffset = -8;
			rOffset = 6;
		}
		
		
		let passOutcome = '';
		if (receiver.inPlayTracking.events.pass_outcome_caught) {
			passOutcome = 'pass_outcome_caught';
		} else if (receiver.inPlayTracking.events.pass_outcome_touchdown) {
			passOutcome = 'pass_outcome_touchdown';
		} else if (receiver.inPlayTracking.events.pass_outcome_interception) {
			passOutcome = 'pass_outcome_interception';
		} else if (receiver.inPlayTracking.events.pass_outcome_incomplete) {
			passOutcome = 'pass_outcome_incomplete';
		} else {
			console.log('no passOutcome');
			return;	// no valid outcome
		}


		// draw circle indicating pass event
		this.doc.circle(
			this.field.getX( qb.inPlayTracking.events['pass_forward'].x ),
			this.field.getY( qb.inPlayTracking.events['pass_forward'].y ),
			2
		)
		.lineWidth(1)
		.fillAndStroke("#FFA500", "#ff9900");
		
		
		// draw topSpeed circle, this should be above outcome drawing, to ensure priority and overwriting
		this.topSpeed(receiver);		

		


		// draw pass outcome event circle
		if (passOutcome == 'pass_outcome_incomplete' || passOutcome == 'pass_outcome_interception') {
			this.doc.circle(
				this.field.getX( receiver.inPlayTracking.events[passOutcome].x ), 
				this.field.getY( receiver.inPlayTracking.events[passOutcome].y ),
				3
			)
			.fill("black");
			
			this.doc.fontSize(6)
			.fillColor("red")
			.text('X', this.field.getX( receiver.inPlayTracking.events[passOutcome].x ) - 2, this.field.getY( receiver.inPlayTracking.events[passOutcome].y ) - 2)
			.fillColor("black");
		} else {
			this.doc.circle(
				this.field.getX( receiver.inPlayTracking.events[passOutcome].x ), 
				this.field.getY( receiver.inPlayTracking.events[passOutcome].y ),
				2
			)
			.lineWidth(1)
			.fillAndStroke("#FFA500", "#ff9900")
			.fillColor("black");
		}

		
		
		
				
		// draw pass line
		this.doc.moveTo(
			this.field.getX( qb.inPlayTracking.events['pass_forward'].x ), 
			this.field.getY( qb.inPlayTracking.events['pass_forward'].y )
		)
		.lineTo(
			this.field.getX( receiver.inPlayTracking.events[passOutcome].x ), 
			this.field.getY( receiver.inPlayTracking.events[passOutcome].y )
		)
		.dash(5, {space: 2})
		.strokeColor("#c30222")
		.stroke();
				

				
				
		let qbAdjusted = this.checkBounds( qb.inPlayTracking.events['pass_forward'].x, qb.inPlayTracking.events['pass_forward'].y, qbOffset);	
		qbHeadX = qbAdjusted.x;
		qbHeadY = qbAdjusted.y;
		
		
		let rAdjusted = this.checkBounds( receiver.inPlayTracking.events[passOutcome].x, receiver.inPlayTracking.events[passOutcome].y, rOffset);
		receiverHeadX = rAdjusted.x;
		receiverHeadY = rAdjusted.y;
		

		// get play quarter and clock
		this.setStatContext(this.event, receiver.inPlayTracking.events[passOutcome]);
		

		let statDesc = qb.yards + ' yard';
		if (qb.touchdown) {
			statDesc += ' touchdown pass';
		} else if (qb.firstdown) {
			statDesc += ' completion for 1st down';
		} else if (passOutcome == 'pass_outcome_incomplete') {
			statDesc = 'Incomplete Pass';
		} else if (passOutcome == 'pass_outcome_interception') {
			statDesc = 'Interception';
		} else if (passOutcome == 'qb_sack') {
			statDesc = 'Sacked';
		} else {
			statDesc += ' completion';
		}

		this.doc.image(this.base + qb.gsisId + '.png', qbHeadX, qbHeadY, { fit: [ this.photoSize, this.photoSize] })
		.fontSize(5)
		.text(qb.name, (qbHeadX + (this.photoSize / 2)) - (this.nameSize / 2), (qbHeadY + this.photoSize + 1), { width: this.nameSize, align: 'center'} );
		
		this.doc.image(this.base + receiver.gsisId + '.png', receiverHeadX, receiverHeadY, { fit: [this.photoSize, this.photoSize] })
		.text(receiver.name, (receiverHeadX + (this.photoSize/2)) - (this.nameSize / 2), (receiverHeadY + this.photoSize + 1), { width: this.nameSize, align: 'center'} );
		
		this.doc.fontSize(8)
		.text(this.statContext, (this.field.mag * 12), 5, this.statPlacement)
		.moveDown(.2)
		.text(statDesc, this.statPlacement );
				
	}

}

module.exports = Pass;