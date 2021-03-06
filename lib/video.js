// refernce: http://docs.brightcove.com/en/video-cloud/cms-api/references/cms-api/versions/v1/index.html#api-videoGroup-Get_Videos
var events = require('events');
var util = require('util');
var Uri = require('jsuri');
var querystring = require('querystring');
/**
 * Represents the Video API object.
 * @constructor
 * @param {string} accountId - The account ID to lookup videos against.
 * @param {OAuth} oauthClient - The authorized api client.
 */
var VideoClient = function VideoClient(accountId, oauthClient) {

	events.EventEmitter.call(this);
	this.oauthClient = oauthClient;
	this.baseUrl = 'https://cms.api.brightcove.com/v1';
	this.getVideosUrl = this.baseUrl + '/accounts/'+ accountId +'/videos';

	this.getAccountId = function getAccountId() {
		return accountId;
	}
}

util.inherits(VideoClient, events.EventEmitter);


VideoClient.prototype.commands = {
	get_videos: 'get_videos',
	get_video_sources: 'get_video_sources',
}

/**
 * Call the Get Videos API via the OAuth Client
 * @param {Object} options - addition parameters.
 * @returns {Promise} - The promise.
 */
VideoClient.prototype.getVideos = function getVideos(options) {
	var url = new Uri(this.getVideosUrl);
	var opts = {
		hostname: url.host(),
		path: url.path() + url.query(),
		method: 'GET'
	};
	var qs = querystring.stringify(options);
	if(qs){
		opts.path = opts.path + "?" + qs;
	}
	return this.oauthClient.makeAuthenticatedRequest(this.commands.get_videos, opts);
}

/**
 * Call the Get Videos API via the OAuth Client
 * @param {String} videoId - Video ID to lookup.
 * @returns {Promise} - The promise.
 */
VideoClient.prototype.getVideoSources = function getVideoSources(videoId) {
	var url = new Uri(this.getVideosUrl + "/" + videoId + "/sources");
	var opts = {
		hostname: url.host(),
		path: url.path() + url.query(),
		method: 'GET'
	};
	return this.oauthClient.makeAuthenticatedRequest(this.commands.get_video_sources, opts);
}



module.exports = VideoClient;
