'use strict';

class Field {
	
	constructor(pdf, fieldConfig) {
		if (!pdf) {
			throw new Error('no pdf reference passed to field');
		}
		this.doc = pdf.doc;
		this.baseFieldWidth = fieldConfig.width;
		this.baseFieldHeight = fieldConfig.height;
		this.mag = fieldConfig.mag;
		this.fieldWidth = this.baseFieldWidth * this.mag;
		this.fieldHeight = this.baseFieldHeight * this.mag;
		this.absYardline = false;
		this.direction = '';
	}

	getX(x) {
		// magnify
		return x * this.mag;	
	}
	
	getY(y) {
		// invert and magnify 
		return this.fieldHeight - (y * this.mag);	
	}

	getAbsYardline(file) {	// takes entire NGS play tracking file
		let teamMapper = {};
		teamMapper[file.schedule.homeTeamId] = file.schedule.homeTeamAbbr;
		teamMapper[file.schedule.visitorTeamId] = file.schedule.visitorTeamAbbr;
		let possession = teamMapper[file.play.possessionTeamId];
		if (file.play.yardline && file.play.yardline == "50") {
			this.absYardline = 60;
		} else if ((file.play.yardlineSide == possession && file.play.playDirection == 'left') || (file.play.yardlineSide != possession && file.play.playDirection == 'right')) {
			this.absYardline = 120 - (file.play.yardlineNumber + 10);
		} else {
			this.absYardline = (file.play.yardlineNumber + 10);
		}
		this.direction = file.play.playDirection;
	}

	drawField() {
		
		// end zones
		this.doc.rect(0, 0, 10 * this.mag, this.fieldHeight);
		this.doc.fill('#F0F0F0');

		// end zones
		this.doc.rect(this.fieldWidth - (10 * this.mag), 0, (10 * this.mag), this.fieldHeight);
		this.doc.fill('#F0F0F0');

		this.doc.moveTo(0, 0)
		.lineTo(this.fieldWidth, 0)
		.lineTo(this.fieldWidth, this.fieldHeight)
		.lineTo(0, this.fieldHeight)
		.lineTo(0, 0)
		.undash()
		.strokeColor("#333")
		.stroke();


	}

	drawScrimmage() {
		// adjusted scrimmage
		// var scrimmage = getX(absYardline);
		// doc.moveTo( scrimmage, getY(_.min(trackY) * 1.10))
		// .lineTo(scrimmage, getY(_.max(trackY) * 1.10))
		// .undash()
		// .strokeColor("#999")
		// .stroke();

		// full scrimage
		let scrimmage = this.getX(this.absYardline);
		this.doc.moveTo( scrimmage, 0)
		.lineTo(scrimmage, this.fieldHeight)
		.undash()
		.strokeColor("#999")
		.stroke();
	}

}

module.exports = Field;