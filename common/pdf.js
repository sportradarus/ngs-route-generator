'use strict';

const pdfkit = require('pdfkit');
const fs = require('fs');

class PDF {
	
	constructor(file) {
		// open PDF stream
		this.doc = new pdfkit();
		this.docStream = this.doc.pipe(fs.createWriteStream(file));
	}

}

module.exports = PDF;