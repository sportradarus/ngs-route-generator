'use strict';

const Promise = require('bluebird');
const spawn = require('child_process').spawn;

class PNG {
	
	constructor() {
		
	}

	convert(pdfFile, pngFile) {

		return new Promise( (resolve, reject) => {
			
			// crop pdf and convert to PNG
			// -trim '-bordercolor', 'none', '-border', '10x10',
			//'-transparent',
			//'white',
			
			let conversion = spawn('convert', [
					'-density',
					'500',
					pdfFile,
					'-resize',
					'50%',
					'-trim',
					'-fuzz',
					'10%',
					'+antialias',
					pngFile
				],
				{'env': process.env}
			);
			
			conversion.stdout.on('data', (data) => {
				console.log(data);
			});
			conversion.stderr.on('data', (data) => {
				console.log("convert stderr: \t" + data);
				reject(data);
			});
			conversion.on('error', (data) => {
				console.log('convert on error data: ', data);
				conversion.kill();
				reject(data);
			});
			conversion.on('exit', (code) => {
				conversion.kill();
				resolve();
			});

		});

	}

}

module.exports = PNG;