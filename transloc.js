import { AsyncStorage } from "react-native";

class transloc{

	constructor(key) {
		this.key = key;
		this.agency = '1323';

		this.data = {
			routes: {},
			stops: []
		};

		this.campus = '';
	}


	load(callback) {
		let finished = false,
            tryFinish = () => {
            	let routesLoaded = Object.keys(this.data['routes']).length > 0;
            	let stopsLoaded = this.data['stops'].length > 0;
                if(!finished && routesLoaded && stopsLoaded){
                	callback();
                	finished = true;
                } 
            }

        let loadStorage = (key, next) => {
        	 AsyncStorage.getItem(key)
	        .then(data => {
	            if(Object.keys(this.data[key]).length == 0){
	                try{
	                	data = JSON.parse(data);
	                	// make sure data from storage
	                	// is not empty before loading
	                	if(data.length > 0 || Object.keys(data).length > 0){
	                		this.data[key] = data;
	                    	next();
	                	}
	                } catch(e) {};
	                
	            }
	        });
        }

        // try to load data from
        // storage before using api
        loadStorage('stops', () => {
        	tryFinish();
	    });
	    loadStorage('routes', () => {
    		tryFinish();
    	});

       	// get data from transloc api
		this.get('routes', {}, (data) => {
			let routes = {};

			data[this.agency].forEach(route => {
				routes[route.route_id] = route.long_name.replace(/Route\s+/,'');
			});

			AsyncStorage.setItem('routes', JSON.stringify(routes));
			this.data.routes = routes;
			tryFinish();
		});
		this.get('stops', {}, (data) => {
			AsyncStorage.setItem('stops', JSON.stringify(data));
			this.data.stops = data;
			tryFinish();
		});
	}


	get(page, query, callback) {

		let queryString = Object.keys(query).map(key => {
			return `${key}=${query[key]}`;
		}).join('&');

		let api = 'https://transloc-api-1-2.p.rapidapi.com/';

		let ffetch = (url) => {
		    const options = {
		        method: 'get',
		        headers: new Headers({
		        	'X-RapidAPI-Key': this.key,
		        	'Content-Type': 'application/x-www-form-urlencoded'
		        })
		    };
		    return fetch(url, options);
		}

		ffetch(`${api}${page}.json?callback=call&agencies=1323&${queryString}`)
		.then(function(response) {
		    return response.json();
		})
		.then(function(result) {
		   callback(result.data);
		});
	}


	stops() {
		return this.data.stops;
	}


	distance(lat1,lon1,lat2,lon2) {
        function deg2rad(deg) {
          return deg * (Math.PI/180)
        }

      var R = 6371; // Radius of the earth in km
      var dLat = deg2rad(lat2-lat1);  // deg2rad below
      var dLon = deg2rad(lon2-lon1); 
      var a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      var d = R * c; // Distance in km
      return d;
    }


	closestStop(lat, lng) {
        let stopArray = [];

        Object.keys(this.data.stops).forEach(s => {
            stopArray.push(this.data.stops[s]);
        });

        stopArray.sort((a, b) => {
        	a = a.location;
        	b = b.location;
            return this.distance(lat, lng, a.lat, a.lng) > this.distance(lat, lng, b.lat, b.lng) ? 1 : -1;
        });

        let stop = stopArray[0];
        stop.campus = this.closestCampus(stop.location.lat, stop.location.lng);
        this.campus = stop.campus;
        return stop;
    }


	closestCampus(lat, lng) {
		let campuses = [
			{
				name: 'College Ave',
				location: {
					lat: 40.503028, 
					lng: -74.450470
				}
			},
			{
				name: 'Cook/Douglass',
				location: {
					lat: 40.483457, 
					lng: -74.435324
				}
			},
			{
				name: 'Busch',
				location: {
					lat: 40.521025, 
					lng: -74.460928
				}
			},
			{
				name: 'Livingston',
				location: {
					lat: 40.522801, 
					lng: -74.436524
				}
			}
		];

		campuses.sort((a, b) => {
        	a = a.location;
        	b = b.location;
            return this.distance(lat, lng, a.lat, a.lng) > this.distance(lat, lng, b.lat, b.lng) ? 1 : -1;
        });

        return campuses[0].name;
	}


	routeName(routeId) {
		return this.data.routes[routeId];
	}


	arrivalEstimates(stopId, callback) {
		let dests = {
			'A': ['College Ave', 'Busch'],
			'B': ['Livingston', 'Busch'],
			'C': ['Loop'],
			'EE': ['College Ave', 'Cook/Douglass'],
			'F': ['College Ave', 'Cook/Douglass'],
			'H': ['College Ave', 'Busch'],
			'LX': ['College Ave', 'Livingston'],
			'REXL': ['Cook/Douglass', 'Livingston'],
			'REXB': ['Cook/Douglass', 'Busch'],
			'Weekend 1': ['All Campuses'],
			'Weekend 2': ['All Campuses'],
			'New BrunsQuick 1 Shuttle': ['College Ave', 'New Brunswick'],
			'New BrunsQuick 2 Shuttle': ['College Ave', 'New Brunswick'],
			
		}

		this.get('arrival-estimates', {
			stops: stopId
		}, (data) => {
			let arrivals = {};

			if(data.length > 0){
				data[0].arrivals.forEach(a => {
					let key = a.route_id;
					if(typeof arrivals[key] == 'undefined'){

						let name = this.routeName(a.route_id);
						let dest = dests[name].filter(d => {
							return d != this.campus;
						})[0];

						arrivals[key] = {
							estimates: [],
							name: name,
							destination: `To ${dest}`
						};
					}
					let time = Date.parse(a.arrival_at) - Date.now();
					arrivals[key].estimates.push(time);
				});
			}

			callback(arrivals);
		});
	}



}



module.exports = transloc;