/**  Script to change Weather and other phenomenons for the scene to relate real world.
* @author Lasse Annola <lasseann@ee.oulu.fi>
*/

/** 
 * Script to change Weather and other phenomenons for the scene to relate real world. Currently no sound, if some is recorded should be added here.
 * @module Time&Weather
 */

// Include our utils script that has asset storage and bytearray utils etc.
// !ref: http://meshmoon.data.s3.amazonaws.com/app/lib/admino-utils-common-deploy.js, Script
// !ref: http://meshmoon.data.s3.amazonaws.com/app/lib/class.js, Script
// !ref: http://meshmoon.data.s3.amazonaws.com/app/lib/json2.js, Script

/* We are using OpenWeatherMap.org free API to get weather data for StreetArtGangs */

engine.IncludeFile("http://meshmoon.data.s3.amazonaws.com/app/lib/class.js");
engine.IncludeFile("http://meshmoon.data.s3.amazonaws.com/app/lib/admino-utils-common-deploy.js");
SetLogChannelName("Time And Weather Script"); //this can be anything, but best is your aplication name

frame.Updated.connect(Update);

/** Simple interval on how often we get weather info from OpenWeatherMap.org.
 * @type int */
var interval = 45000;

/** The WeatherEntity which has SkyX and so on.
 * @type Object */
var entity = scene.EntityByName('WeatherEntity');

/** 
 * Update function that is ran on every frame.
 * @param {int} frametime - Int to check how many frames are through.
 */
function Update (frametime) {
	if (interval >= 45000) {
		interval = 0;	
		GetWeather();
	} else 
		interval++;
}


/** 
 * Get Weather information from OpenWeatherMap API for Oulu and parse information that we need. Later call SetWeather to assign values for our SkyX object.
 */
function GetWeather() {
	var url = 'http://api.openweathermap.org/data/2.1/weather/city/643492';
	var transfer = asset.RequestAsset(url, "Binary", true);
	transfer.Succeeded.connect(function(){
		var json = JSON.parse(transfer.RawData());
		var name = json.name;
		var wind = json.wind;
		var speedOfWind = wind.speed;
		var cloudPercentage = json.clouds.all;
		var weather = json.weather;

		for (var i in weather) {
			var mainWeather = weather[i].main;
			var desc = weather[i].description;
		}
		
		var desc = weather.description;

		this.me.skyx.cloudCoverage = cloudPercentage;
		this.me.skyx.windSpeed = speedOfWind;

		SetWeather(mainWeather, desc);
	});
}


/** 
 * Set weather data that we got and parsed. TODO: Thunder not made yet for our logic. Add later if we have time.
 * @param {String} mainWeather - Main status of our weather (Snow,  Rain, Mist & etc)
 * @param {String} desc - Description of weather to get more specific information about (Light snow, light rain or so.)
 */
function SetWeather(mainWeather, desc) {
/* Different weathers that can be manipulated in scene. */
		Log(mainWeather + "--" + desc);
		if (mainWeather == 'Snow' && desc != 'light snow') {
			/* Harder snow effect and streets get snowy. */
			entity.mesh.materialRefs = new Array('http://meshmoon.eu.scenes.2.s3.amazonaws.com/mediateam-b4527d/test2/particle/snowflakes_prop_mat.material');
			entity.mesh.meshRef = 'http://meshmoon.eu.scenes.2.s3.amazonaws.com/mediateam-b4527d/test2/particle/snowflakes_prop.mesh';
			entity.particlesystem.particleRef = 'http://meshmoon.eu.scenes.2.s3.amazonaws.com/mediateam-b4527d/test2/particle/snow_prop.particle';
                              entity.particlesystem.enabled = true;
		} else if (desc == 'light snow') {
			/* Add lighter snow effect, streets dont get snowy */
			entity.mesh.materialRefs = new Array('http://meshmoon.eu.scenes.2.s3.amazonaws.com/mediateam-b4527d/test2/particle/snowflakes_prop_mat.material');
			entity.mesh.meshRef = 'http://meshmoon.eu.scenes.2.s3.amazonaws.com/mediateam-b4527d/test2/particle/snowflakes_prop.mesh';
			entity.particlesystem.particleRef = 'http://meshmoon.eu.scenes.2.s3.amazonaws.com/mediateam-b4527d/test2/particle/lightsnow_prop.particle';
                              entity.particlesystem.enabled = true;
		}

		if (mainWeather == 'Rain' && desc == 'light rain') {
			//Light rain
			entity.mesh.materialRefs = new Array('http://meshmoon.eu.scenes.2.s3.amazonaws.com/mediateam-b4527d/test2/particle/rain_prop2_mat.material');
			entity.mesh.meshRef = 'http://meshmoon.eu.scenes.2.s3.amazonaws.com/mediateam-b4527d/test2/particle/rain_prop2.mesh';
			entity.particlesystem.particleRef = 'http://meshmoon.eu.scenes.2.s3.amazonaws.com/mediateam-b4527d/test2/particle/lightrain_prop.particle';
                              entity.particlesystem.enabled = true;
		} else if (mainWeather == 'Rain') {
			//Heavier or heavy rain. Also streets are flooded
			entity.mesh.materialRefs = new Array('http://meshmoon.eu.scenes.2.s3.amazonaws.com/mediateam-b4527d/test2/particle/rain_prop2_mat.material');
			entity.mesh.meshRef = 'http://meshmoon.eu.scenes.2.s3.amazonaws.com/mediateam-b4527d/test2/particle/rain_prop2.mesh';
			entity.particlesystem.particleRef = 'http://meshmoon.eu.scenes.2.s3.amazonaws.com/mediateam-b4527d/test2/particle/lightrain_prop.particle';

			this.me.fog.mode = 3;
			this.me.fog.startDistance = 2;
            this.me.fog.endDistance = 100;
			this.me.fog.expDensity = 1,0;
            entity.particlesystem.enabled = true;
		} else 
                        entity.particlesystem.enabled = false;

		if (mainWeather == 'Mist') {
			this.me.fog.mode = 2;
			this.me.fog.startDistance = 5;
			this.me.fog.expDensity = 0,01;
		} else {
			this.me.fog.mode = 0;
		}

		if (mainWeather == 'Thunderstorm') {
			/* Maybe some thundah? */
		}
}