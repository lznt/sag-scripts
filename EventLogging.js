/**  Script for logging events to GameAnalytics.
* @author Lasse Annola <lasseann@ee.oulu.fi>
*/

/** 
 *  Script for logging events to GameAnalytics.
 * @module EventLogging
 */

// Include the json parse/stringify library. We host it here if you want to use it:
// !ref: http://meshmoon.data.s3.amazonaws.com/app/lib/json2.js, Script

// Include our utils script that has asset storage and bytearray utils etc.
// !ref: http://meshmoon.data.s3.amazonaws.com/app/lib/admino-utils-common-deploy.js, Script
// !ref: http://meshmoon.data.s3.amazonaws.com/app/lib/class.js, Script


engine.IncludeFile("http://meshmoon.data.s3.amazonaws.com/app/lib/class.js");
engine.IncludeFile("http://meshmoon.data.s3.amazonaws.com/app/lib/admino-utils-common-deploy.js");

SetLogChannelName("EventLogging"); //this can be anything, but best is your aplication name
Log("Script starting");
frame.Updated.connect(Update);

//Connect UserConnect and Disconnect events to handler.
if (server.IsRunning()) {
    server.UserConnected.connect(UsrConnected);
    server.UserDisconnected.connect(UsrDisconnected);
}

/** Array for gPlayers that have already been sent to GA for one event.
 * @type array */
var sentPlayers = [];
/** Player objects created in COnnected, helps to manage player states while they are connected to scene.
 * @type array */
var gPlayers = [];
/** Interval to prevent events happening on every frame.
 * @type int */
var intervalForUpdate = 0;
/** Array of players who are busted at the moment.
 * @type array */
var sentPlayersBust = [];
/** Start number for UID method to create individual id for everyone.
 * @type int */
var c = 1;

/** 
 * Update function that is ran on every frame. Inside we use interval so that get is launched approx. every 3 seconds.
 * @param {int} frametime - Int to check how many frames are through.
 */
function Update(frametime) {
	if(server.IsRunning()) {
		if (intervalForUpdate < 500) intervalForUpdate++;
		else {
			if (sentPlayers.length > 0 || sentPlayersBust.length > 0) {
				handlePlayersAlreadySent();
			} else {
				handlePlayersFirstTime();
			}

			intervalForUpdate = 0;
		}
	} 
}

/** 
 * ID function to create unique id for all users.
 * @returns {Number} Unique id for player.
 */
function uid() {
    var d = new Date(),
        m = d.getMilliseconds() + "",
        u = ++d + m + (++c === 10000 ? (c = 1) : c);

    return u;
}

/** 
 * Launched when user connects to our server
 * @param {int} cid - player id 
 * @param {Object} connection - COnnection object, which holds inside information about connected user. 
 */
function UsrConnected(cid, connection) {
	var username = connection.GetProperty('username');
	var userid = uid();
	//Add Watcher with its session id to our gPlayers array, until he disconnects.
	var obj = new Object();
	obj.player = username;
	obj.id = userid;
	obj.sent = false;
	gPlayers.push(obj);

	SendConnectionInfo(obj.player, userid, 4);
}

/** 
 * Launched when user disconnects from server, user is removed from players array.
 * @param {int} cid - player id 
 * @param {Object} connection - COnnection object, which holds inside information about connected user. 
 */
function UsrDisconnected(cid, connection) {
	var username = connection.GetProperty('username');
	for (var i in gPlayers) {
		if (gPlayers[i].player == username) {
			SendConnectionInfo(gPlayers[i].player, gPlayers[i].id, 5); 
			gPlayers.splice(gPlayers[i], 1);

		}
	}
}

/** 
 * Function to handle players and add them to a list of sent players. This way we wont send duplicate events from same player.
 */
function handlePlayersFirstTime() {
	var players = scene.EntitiesOfGroup('Player');
	for (var n in players) {
		if (players[n].dynamiccomponent.GetAttribute('spraying') == true) { GetPlayersOnSpray(); SendWatcherInfo(true, 6); Log('Send watcher info'); }
	}
	http.client.Get("http://vm0063.virtues.fi/gangsters/").Finished.connect(function(req, status, error) {
		if (status == 200) {
			var json = JSON.parse(req.body);
			for (var n in json) {
				if (json[n].bustedviapolice != 0) { SendPlayerInfo(json[n].name, 2); SendWatcherInfo(true, 7); }
			}
		}
	});
}

/** 
 * Send info about players that are sent if their state changes. If they have no pending activities on anymore to log, remove them from sentPlayers. 
 */
function handlePlayersAlreadySent() {
	sentPlayersLoop:
	for (var i in sentPlayers) {
		var players = scene.EntitiesOfGroup('Player');
		for (var n in players) {
			if (players[n].dynamiccomponent.GetAttribute('spraying') == true && sentPlayers[i].name != players[n].name) { SendPlayerInfo(); SendWatcherInfo(true, 6); Log('Player sendiiing!');  break sentPlayersLoop; }
			else if (players[n].dynamiccomponent.GetAttribute('spraying') == false && sentPlayers[i].name == players[n].name) { sentPlayers.splice(i, 1); SendWatcherInfo(false, 6);  break sentPlayersLoop; }
		}

		http.client.Get("http://vm0063.virtues.fi/gangsters/").Finished.connect(function(req, status, error) {
			if (status == 200) {
				var json = JSON.parse(req.body);
				for (var n in json) {
					for (var y in sentPlayersBust) {
						if (sentPlayersBust[y] == null) break;
						if (json[n].bustedviapolice != 0 && sentPlayersBust[y].name != json[n].name) { SendPlayerInfo(json[n].name, 2); SendWatcherInfo(true, 6); break;}
						else if (json[n].bustedviapolice == 0 && sentPlayersBust[y].name == json[n].name) { sentPlayersBust.splice(i, 1); SendWatcherInfo(false, 6); break;  }	                  
					}
				}
			}
		});
	}
}


/** 
 * Send information about Watchers, so the people who are looking at the scene via realXtend browser(Meshmoon)
 * @param {bool} spraying - Boolean to check if is spraying or not. 
 * @param {int} eventId - Id for our Django server to check which event was launched.
 */
function SendWatcherInfo(spraying, eventId) {
	Log('SendWatcherInfo ' + spraying  + " -- " + eventId);
	for (var i in gPlayers) {
		//make sure that info is sent only once.
		if (!spraying) { gPlayers[i].sent = false; return; }
		Log('In watcherSEnding..');
		//Get position of watcher and include it in post to GA.
		var watchers = scene.FindEntitiesContaining('Avatar');
		for (var n in watchers) {
			Log('In watcherSEndingpolling watchers' + watchers[i]);

			if (watchers[n].description == gPlayers[i].player) {
				var pos = String(watchers[n].placeable.transform.pos.x) + ',' + String(watchers[n].placeable.transform.pos.y) + ',' + String(watchers[n].placeable.transform.pos.z);
				pos = pos.split(",").join('%2C');
				Log(pos + "for watcher entity");
			} 
		}

		if (!pos) return;

        http.client.Get("http://vm0063.virtues.fi/events/" + eventId + "/playername" + '/' + gPlayers[i].player + "/" + "playerpos/" + pos + '/playerinfo' + '/' +  gPlayers[i].player 
			+ '/playerdata' + '/' + gPlayers[i].id + '/').Finished.connect(function(req, status, error) {
					if (status == 200) {
						gPlayers[i].sent = true;
					}
		});
	}
}

/** 
 * Get players that are roaming in oulu and if they are spraying send them to SendPlayerInfo.
 */
 function GetPlayersOnSpray(){
	var gPlayers = scene.EntitiesOfGroup('Player');
	for (var i in gPlayers) {
		if (gPlayers[i].dynamiccomponent.GetAttribute('spraying') == true) {
			SendPlayerInfo(gPlayers[i].name, 1);
		}
	}
}


/** 
 * Info sent about players Connecting or Disconnecting to scene.
 * @param {String} player - Players name in string format
 * @param {int} uniqId - Unique id created with uid() function
 * @param {int} eventId - Id for the event we are sending to Django.
 */
function SendConnectionInfo(player, uniqId, eventId) {
	   http.client.Get("http://vm0063.virtues.fi/events/" + eventId + "/playername" + '/' + player + "/" + "playerpos/" + "nopos" + '/playerinfo' + '/' + player 
			+ '/playerdata' + '/' + uniqId + '/').Finished.connect(function(req, status, error) {
				if (status == 200) {
				}
	  });
}

/** 
 * Send players on different events that occur in game and make sre that their object in gPLayers array are right. This way we dont send the same information multiple times.
 * @param {String} player - Players name in string format
 * @param {int} eventId - Id for the event we are sending to Django.
 */
function SendPlayerInfo(player, eventId) {
	var player = scene.EntityByName(player);

    if(!player) return

    if (sentPlayers.indexOf(player) != -1) return;
	Log("Player that we are sending to GA " + player);
	
	//Keep arrays coherent to actual send info
	if (player.bustedviapolice == true) sentPlayersBust.push(player);
	else sentPlayers.push(player);
	
	var name = player.name;
	var gang = player.dynamiccomponent.GetAttribute('gang');
	var pos = String(player.dynamiccomponent.GetAttribute('posGPS').x) + ',' + String(player.placeable.transform.pos.y) + ',' + String(player.dynamiccomponent.GetAttribute('posGPS').z);
	Log(pos);
	pos = pos.split(",").join('%2C');
	http.client.Get("http://vm0063.virtues.fi/events/" + eventId + "/playername" + '/' + name + "/" + "playerpos/" + pos + '/playerinfo' + '/' + gang 
		+ '/playerdata' + '/' + uid() + '/').Finished.connect(function(req, status, error) {
				if (status == 200) {
				}
	});
}



