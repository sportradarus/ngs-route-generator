var AWS = require('aws-sdk');
var fs = require('fs');

AWS.config.update({region:'us-west-2'});
var s3 = new AWS.S3();

function upload(fileName, content) {
	
	return new Promise(function(resolve, reject) {
		var opts = {
			Bucket: process.env.AWS_NGS_BUCKET,
			Key: fileName,
			ACL: 'public-read',
			ContentType: 'application/json',
			CacheControl: 'max-age=1800',
			Body: new Buffer(JSON.stringify(content)).toString('utf8')
		};
		s3.upload(opts, function(err, data) {
			if (err) {
				return reject(err);
			}
			resolve();
		});
	});
}

function uploadBuffer(content, fileName, contentType, contentLength) {
	
	return new Promise(function(resolve, reject) {
		var options = {
			Bucket: process.env.AWS_NGS_BUCKET,
			Key: fileName,
			ACL: 'public-read',
			CacheControl: 'max-age=604800',
			ContentType: contentType,
			ContentLength: contentLength,
			Body: content
		};

		s3.upload(options, function(err, data) {
			if (err) {
				return reject(err);
			}
			resolve(data);
		});
	});
}

function remove(fileName) {

	return new Promise(function(resolve, reject) {
		var options = {
			Bucket: process.env.AWS_NGS_BUCKET,
			Key: fileName
		};

		s3.deleteObject(options, function(err, data) {
			if (err) {
				return reject(err);
			}
			return resolve(data);
		});
	});
}

function get(srusGameId) {

	return new Promise(function(resolve, reject) {
		
		var fileName = srusGameId + ".json";
		var opts = {
			Bucket: process.env.AWS_NGS_BUCKET,
			Key: fileName
		};

		var reader = s3.getObject(opts).createReadStream();
		var writer = fs.createWriteStream('./ngs-data/' + fileName);

		reader.pipe(writer);

		writer.on("error", function(err) {
			return reject(err);
		});
		reader.on("error", function(err) {
			return reject(err);
		});
		reader.on("end", function() {
			return resolve();
		});
	});
}

function getJSONFile(bucket, fileName) {

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
			console.log(data);
			var fileContents = data.Body.toString();
			var content = JSON.parse(fileContents);
			

			return resolve(content);
		});
	});
}

//currently not supporting paging, but could by checking for data.truncated
function listBucketObjects(bucket) {
	var options = {
		'Bucket' : bucket
	};

	return new Promise(function(resolve, reject) {

		s3.listObjects(options, function(err, data) {
  			if (err) {
  				return reject(err);
  			}
  			resolve(data.Contents);
		});
	});
}

module.exports = {
	upload: upload,
	uploadBuffer: uploadBuffer,
	get: get,
	getJSONFile: getJSONFile,
	listBucketObjects: listBucketObjects,
	remove: remove
};