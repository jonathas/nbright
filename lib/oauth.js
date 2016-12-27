
// api reference: http://docs.brightcove.com/en/video-cloud/oauth-api/guides/get-token.html

var events = require('events'),
	util = require('util'),
	https = require('https'),
	Uri = require('jsuri'),
	AccessToken = require('./accessToken'),
	Errors = require('./errors');

/**
 * Represents the oauth API object.
 * @constructor
 * @param {string} clientId - The Oauth client identifier.
 * @param {OAuth} clientSecret - The oauth secrent.
 */
var OAuth = function OAuth(clientId, clientSecret) {

	events.EventEmitter.call(this);

	this.baseUrl = 'https://oauth.brightcove.com/v3';
	this.credentialsUrl = this.baseUrl + '/client_credentials';
	this.accessTokenUrl = this.baseUrl + '/access_token';
	this.lastAccessToken = null;

	this.getClientId = function getClientId() {
		return clientId;
	}

	this.getClientSecret = function getClientSecret() {
		return clientSecret;
	}
}

util.inherits(OAuth, events.EventEmitter);


OAuth.prototype.commands = {

	create_access_token: 'create_access_token',
	create_client_credential : 'create_client_credential',
	delete_client_credential : 'delete_client_credential',
	get_client_credential_by_id : 'get_client_credential_by_id',
	get_client_credential : 'get_client_credential',
	update_client_credential : 'update_client_credential'
}


OAuth.prototype.getAuthorizationHeader = function getAuthorizationHeader(){
	return 'Basic ' + new Buffer(this.getClientId() + ":" + this.getClientSecret()).toString('base64');
}

OAuth.prototype.makeAuthenticatedRequest = function makeAuthenticatedRequest(command,options,callback){
	this.getAccessToken(function(err, accessToken) {
    if (err) {
      callback(err, null);
    } else {
    	options.headers = {
					'Content-Type' : 'application/json',
					'Authorization' : accessToken.token_type + ' ' + accessToken.access_token
				};
      this.makeRequest(command, options, callback);
    }
  }.bind(this));
}

OAuth.prototype.makeRequest = function makeRequest(command, options, callback) {

	if (typeof callback === undefined || typeof callback === null)
		throw new Error('no callback defined when calling makeRequest');

	var body = null;

	if (typeof options.body !== undefined) {
		var body = options.body;
		delete options.body;
	}

	var request = https.request(options, function(response) {

		var data = '';

		response.setEncoding('utf8');
		response.on('data', function(chunk) {
			data += chunk;
		}.bind(this));

		response.on('end', function(err) {


			var json = JSON.parse(data.toString());
			var error = handleApiErrors(err, json);

			// emit response
			this.emit(command, error, json);


			// kick off callback, if supplied
			if (typeof callback === 'function'){

				callback(error, json);
			}

		}.bind(this));
	}.bind(this));

	if (body){
		request.write(JSON.stringify(body));
	}

	request.end();

	// handle those pesky http request errors.
	request.on('error', function(e) {

		this.emit(command, e, null);

		// kick off callback, if needed
		if (typeof callback === 'function')
			callback(e, null);
	}.bind(this));
}


/**
 *	Check if the last received token is still valid, return it if valid or request an other one
 */
OAuth.prototype.getAccessToken = function getAccessToken(callback) {
	if (this.lastAccessToken === null || this.lastAccessToken.isExpired()) {
		this.createAccessToken(callback);
	} else {
		callback(null, this.lastAccessToken.getJSON());
	}
}

/**
 *	Request a new access token
 */
OAuth.prototype.createAccessToken = function createAccessToken(callback) {
	var url = buildUrl(this.accessTokenUrl);
	url.addQueryParam('grant_type', 'client_credentials');

	var opts = {
			hostname: url.host(),
			path: url.path() + url.query(),
			method: 'POST',
			headers: {
				'Content-Type' : 'application/x-www-form-urlencoded',
				'Authorization' : this.getAuthorizationHeader()
			}
		};

	this.makeRequest(this.commands.create_access_token, opts, function(err, json) {

		if (!err && json)
			this.lastAccessToken = new AccessToken(json);

		if (typeof callback !== undefined && typeof callback !== null)
			callback(err, json);
	}.bind(this));
}



var buildUrl = function buildUrl(url) {

	var url = new Uri(url);

	return url;
}


var handleApiErrors = function handleApiErrors(err, json) {

	if (err !== undefined) return err;
	if (json == null) return new Errors.InvalidArgument();
	if (json.error != null && json.error != undefined) return new Errors.Api(json);
}

module.exports = OAuth;
