import React from 'react';
import { YellowBox, AppState, StyleSheet, Text, View } from 'react-native';
import { SplashScreen } from 'expo';
YellowBox.ignoreWarnings(['Require cycle:']);

let transloc = require('./transloc.js');
let session = new transloc(require('./transloc-config').apiKey);


export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      stopId: '',
      stopTitle: '',
      arrivals: {},
      state: 'active'
    };

    session.load(() => {
      this.checkLocation();
      setInterval(() => { 
        this.checkLocation();
      }, 45000);
    });

    // count down
    setInterval(() => {
      Object.keys(this.state.arrivals).forEach(r => {
        this.state.arrivals[r].estimates = this.state.arrivals[r].estimates.map(p => {
          return p - 1000;
        }).filter(r => r > 0);
      });

      if(Object.keys(this.state.arrivals).length > 0){
        this.setState(this.state);
      }
    }, 1000);
  }

  checkLocation() {
    navigator.geolocation.getCurrentPosition(
      position => {
        const loc = position.coords;

        let stop = session.closestStop(loc.latitude, loc.longitude);
        if(stop.stop_id != this.state.stopId){
          this.setState({
            stopId: stop.stop_id,
            stopTitle: stop.name
          });
        }
        
        this.refresh();
      },
      error => {
        console.log(error.message);
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 20000 }
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
    session.arrivalEstimates(this.state.stopId, (data) => {
      this.setState({
        arrivals: data
      });
      SplashScreen.hide();
    });
  }

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{this.state.stopTitle}</Text>
        {
          Object.keys(this.state.arrivals).map((key) => {
            let r = this.state.arrivals[key];
            let text = r.name;

            let s = r.estimates.map(ms => {
              let seconds = Math.round(ms/1000);
              if(seconds > 60)
                return Math.round(seconds/60);
              else
                return '<1';
            }).slice(0, 3).join(', ');

            text += ' in ' + s + ' minutes';

            return (<View style={styles.route} key={key}>
                      <Text style={styles.routeTitle}>{text}</Text>
                      <Text style={styles.routeInfo}>{r.destination}</Text>
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
    paddingTop: 5,
    fontSize: 14,
    width: '100%',
    textAlign: 'center',
    color: '#666'
  }


});
