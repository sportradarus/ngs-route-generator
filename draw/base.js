'use strict';

const _ = require('lodash');
const moment = require('moment');

class Base {
	
	constructor(pdf, field, baseDir, players) {
		if (!pdf) {
			throw new Error('no pdf reference passed to field');
		}
		this.doc = pdf.doc;
		this.field = field;
		this.players = players.players;
		this.statContext = "";
		this.statPlacement = {};
		this.photoSize = 20;
		this.nameSize = 40;	// size of text box below photo for name 

		this.base = baseDir;
	}

	lines() {

		_.forEach(this.players, (player) => {
			
			if (["QB","RB","WR","TE","FB"].indexOf(player.position) !== -1 && player.statType != 'defense') {
				this.doc.strokeColor("#458B00");
			} else {
				this.doc.strokeColor("#333333");
				this.doc.strokeOpacity(0.8);
			}

			_.forEach(player.inPlayTracking.data, (tracking, index) => {
				if (!index) {
					this.doc.moveTo(this.field.getX(tracking.x), this.field.getY(tracking.y));
				} else {
					
					if (tracking.event == 'pass_outcome_caught' && player.reception) {
						this.doc.stroke();
						this.doc.strokeColor("#66CD00");
					}
						
					this.doc.lineTo(this.field.getX(tracking.x), this.field.getY(tracking.y));
				}
			});
			
			this.doc.stroke();
		});

	}

	checkBounds(centerX, centerY, offset) {
		let playerX = this.field.getX( centerX + offset );
		let playerY = this.field.getY( centerY ) - (this.photoSize / 2);
		let center = {
			x: this.field.getX(centerX),
			y: this.field.getY(centerY)
		};

		// adjust based on field bounds
		if (playerX < 0) {
			playerX = 5;
		}
		if (playerY < 0) {
			playerY = 0;
		}
		if (playerX + this.nameSize > this.field.fieldWidth) {
			playerX = this.field.fieldWidth - this.nameSize;
		}
		if (playerY + this.nameSize > this.field.fieldHeight) {
			playerY = this.field.fieldHeight - this.nameSize;
		}

		return {
			x: playerX,
			y: playerY
		};
	}

	topSpeed(player) {
		let topSpeed = Math.round(player.inPlayTracking.maxSpeed * 2.04545);
		this.doc.circle(
			this.field.getX( player.inPlayTracking.events['top_speed'].x ), 
			this.field.getY( player.inPlayTracking.events['top_speed'].y ),
			4
		)
		.lineWidth(1)
		.fillAndStroke("white", "#ff0000");

		this.doc.fontSize(4)
		.fillColor("black")
		.text(topSpeed, this.field.getX( player.inPlayTracking.events['top_speed'].x ) - 4, this.field.getY( player.inPlayTracking.events['top_speed'].y ) - 1.5, { width: 8, align: 'center' } )
		.fill('black');	// reset color
	}

	setStatContext(event, outcomeEvent) {
		this.statPlacement = { width: (this.field.fieldWidth - ((this.field.mag * 10) * 2))-10, align: 'right'};
		if (outcomeEvent.x > 60) {
			this.statPlacement = { width: (this.field.fieldWidth - ((this.field.mag * 10) * 2))-10, align: 'left' };
		}

		this.statContext = event.clock;
		if (event.start_situation.down) {
			this.statContext += ', ' + moment().dayOfYear(event.start_situation.down).format('DDDo') + ' & ' + event.start_situation.yfd;
		}
		if (event.period) {
			this.statContext = moment().dayOfYear(event.period).format('DDDo') + ' Quarter, ' + this.statContext;
		}
	}

}

module.exports = Base;