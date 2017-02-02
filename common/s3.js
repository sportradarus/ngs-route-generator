var AWS = require('aws-sdk');
var fs = require('fs');

AWS.config.update({region:'us-west-2'});
var s3 = new AWS.S3();

function upload(bucket, localFile, key) {
	console.log('uploading...');
	return new Promise(function(resolve, reject) {
		var opts = {
			Bucket: bucket,
			Key: key,
			ACL: 'public-read',
			ContentType: 'image/png',
			CacheControl: 'max-age=1800',
			Body: fs.createReadStream(localFile)
		};
		s3.upload(opts, function(err, data) {
			if (err) {
				console.log(err);
				reject(err);
			}
			resolve();
		});
	});
}

function checkForFile(bucket, pngFile) {
	console.log('checkForFile...');
	return new Promise(function(resolve, reject) {
		var opts = {
			Bucket: bucket,
			Key: pngFile
		};
		s3.headObject(opts, function (err, metadata) {  
			if (err && err.code === 'NotFound') {  
				resolve(false);
			} else if (err) {
				reject(err);
			} else {  
				resolve(true);
			}
		});
	});
}

function getJSONFile(bucket, fileName) {
	console.log('getJSONFile...');
	var options = {
		Bucket: bucket,
		Key: fileName,
		ResponseContentType: 'application/json'
	};
	return new Promise(function(resolve, reject) {
		s3.getObject(options, function(err, data) {
			if(err) {
				return reject(err);
			}
			if(!data) {
				console.log('no data for ' + filename);
				return resolve({});
			}
			var fileContents = data.Body.toString();
			var content = JSON.parse(fileContents);
			return resolve(content);
		});
	});
}


module.exports = {
	upload: upload,
	getJSONFile: getJSONFile,
	checkForFile: checkForFile
};