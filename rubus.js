const   request   =     require('react-native-axios'),
        x2j       =     require('react-native-xml2js'),
        parser    =     new x2j.Parser({mergeAttrs: true});

import { AsyncStorage } from "react-native";



//api endpoints
const apiUrl = 'http://webservices.nextbus.com/service/publicXMLFeed?a=rutgers';


let stops = {};
let rubus = {

    getStopPredictions: (stopTag, callback) => {
        stopTag = stopTag.replace(/_.+/, '');
        let searchTags = Object.keys(stops).filter(s => {
            return s.replace(/_.+/, '') == stopTag
        });

        // Longer bus tags are usually
        // the weekend route. Sorting
        // based on day of week is an
        // attempt to speed up search.
        let today = new Date(),
            isWeekend = (today.getDay() == 6 || today.getDay() == 0);
        searchTags.sort((a,b) => {
            if(isWeekend)
                return a.length > b.length ? -1 : 1;
            if(isWeekend)
                return a.length < b.length ? -1 : 1;
        });

        console.log(searchTags);

        searchTags.forEach(tag => {
            stops[tag].routes.forEach(r => {
                doRequest(`${apiUrl}&command=predictions&r=${r}&s=${tag}`)
                .then(function (data) {
                    if(data.body.predictions && data.body.predictions.length > 0){
                        data = data.body.predictions[0]; 

                        let predictionsAvalable = typeof data.direction == 'object' && data.direction.length > 0;
                        if(predictionsAvalable){
                            callback({
                                agencyTitle: data.agencyTitle[0],
                                routeTag: r,
                                routeTitle: data.routeTitle[0],
                                stopTitle: data.stopTitle[0],
                                stopTag: stopTag,
                                predictions: data.direction[0].prediction,
                                direction: data.direction[0].title[0].replace(/\sStudent.+/,'')
                            });
                        }
                    }
                });
            });
        });
    },


    getRouteList: (callback) => {
        doRequest(`${apiUrl}&command=routeList`)
        .then(function (data) {
            callback(data.body.route);
        })
        .catch(function (err) {
            if(err){ reject(err)};
        });
    },


    getRouteConfig: (callback) => {
        doRequest(`${apiUrl}&command=routeConfig`)
        .then(function (data) {
            callback(data.body.route);
        })
        .catch(function (err) {
            if(err){ reject(err)};
        });
    },



    getClosestStop: (lat, lon) => {
        let stopArray = [];

        Object.keys(stops).forEach(s => {
            stopArray.push(stops[s]);
        });


        function distance(lat1,lon1,lat2,lon2) {
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

        stopArray.sort(function(a, b) {
            return distance(lat, lon, a.lat[0], a.lon[0]) > distance(lat, lon, b.lat[0], b.lon[0]) ? 1 : -1;
        });

        return stopArray[0];
    },



    load: (callback) => {

        let finished = false,
            finish = () => {
                if(!finished) callback();
                finished = true;
            }

        AsyncStorage.getItem('stops')
        .then(data => {
            if(Object.keys(stops).length == 0){
                try{
                    stops = JSON.parse(data);
                    if(Object.keys(stops).length > 0){
                        finish();
                    }
                } catch(e) {};
                
            }
        });
        
        rubus.getRouteConfig((data) => {

            let newStops = {};

            data.forEach(r => {
                r.stop.forEach(s => {

                    // stop tag
                    let tag = s.tag[0];
                    if(typeof newStops[tag] == 'undefined'){
                        newStops[tag] = {
                            routes: [],
                            tag: tag,
                            title: s.title[0],
                            lat: s.lat,
                            lon: s.lon,
                        };
                    }

                    // add route to stop
                    if(!newStops[tag].routes.includes(r.tag[0])){
                        newStops[tag].routes.push(r.tag[0]);
                    }
                });
            });

            stops = newStops;

            AsyncStorage.setItem('stops', JSON.stringify(stops));
            finish();
        });
    }
}



function doRequest(url){
    return new Promise((resolve, reject)=>{
        request.get(url)
        .then(function (body) {

            parser.parseString(body.data, function(err, result){
                if(err){reject(err)};
                resolve(JSON.parse(JSON.stringify(result,undefined,3)));
            });
        })
        .catch(function (err) {
            if(err){ reject(err)};
        });
    });
}





module.exports = rubus;