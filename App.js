import React from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { SplashScreen } from 'expo';

let rubus = require('./rubus');


export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      stopTag: '',
      stopTitle: '',
      routes: {},
      state: 'active'
    };

    rubus.load(() => {
      this.checkLocation();
      setInterval(() => { 
        this.checkLocation();
      }, 45000);
    });

    // count down
    setInterval(() => {
      Object.keys(this.state.routes).forEach(r => {
        this.state.routes[r].predictions = this.state.routes[r].predictions.map(p => {
          p.seconds = p.seconds - 1;
          return p;
        }).filter(r => r.seconds >= 1);
      });

      if(Object.keys(this.state.routes).length > 0){
        this.setState(this.state);
      }
    }, 1000);
  }

  checkLocation() {
    navigator.geolocation.getCurrentPosition(
      position => {
        const loc = position.coords;

        let stop = rubus.getClosestStop(loc.latitude, loc.longitude);
        if(stop.tag != this.state.stopTag){
          this.setState({
            stopTag: stop.tag,
            stopTitle: stop.title,
            routes: {}
          });
        }
        
        this.refresh();
      },
      error => {
        console.log(error.message);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
    );
  }


  componentDidMount() {
    SplashScreen.preventAutoHide();
    AppState.addEventListener('change', this._handleAppStateChange);
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange);
  }

  _handleAppStateChange = (nextAppState) => {
    if(nextAppState == 'active' && this.state.state != 'active') this.refresh();
    this.setState({
      state: nextAppState
    });
  };


  refresh() {
    rubus.getStopPredictions(this.state.stopTag, (data) => {
      let routes = this.state.routes;

      routes[data.routeTitle] = data;

      this.setState({
        routes: routes
      });
      SplashScreen.hide();
    });
  }

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{this.state.stopTitle}</Text>
        {
          Object.keys(this.state.routes).map((key) => {
            let text = key;
            let r = this.state.routes[key];

            let s = r.predictions.map(p => {
              if(p.seconds > 60)
                return Math.round(p.seconds/60);
              else
                return '<1';
            }).slice(0, 3).join(', ');

            text += ' in ' + s + ' minutes';

            return (<View style={styles.route} key={key}>
                      <Text style={styles.routeTitle}>{text}</Text>
                      <Text style={styles.routeInfo}>{r.direction}</Text>
                    </View>);
          })
        }
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingTop: 50,
    paddingBottom: 35,
    backgroundColor: '#cc0033',
    color: '#fff',
    width: '100%',
    textAlign: 'center'
  },

  route: {
    paddingTop: 15,
    paddingBottom: 15,
    width: '100%',
    borderBottomColor: '#eee',
    borderBottomWidth: 1
  },

  routeTitle: {
    fontSize: 20,
    width: '100%',
    textAlign: 'center'
  },

  routeInfo: {
    paddingTop: 2,
    fontSize: 14,
    width: '100%',
    textAlign: 'center',
    color: '#666'
  }


});
