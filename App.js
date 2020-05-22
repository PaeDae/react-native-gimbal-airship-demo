/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { Component } from 'react';
import {
  Button,
  NativeEventEmitter,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  StatusBar,
} from 'react-native';

import {
  check,
  PERMISSIONS,
  RESULTS,
  request
} from 'react-native-permissions';

import RNGimbal, {
  BeaconManager,
  GimbalDebugger,
  PlaceManager,
  PrivacyManager,
  EstablishedLocationsManager
} from 'react-native-gimbal';

import {
  UrbanAirship,
} from 'urbanairship-react-native'

import { AirshipGimbalAdapter } from 'urbanairship-gimbal-adapter-react-native';

import Constants from './constants';

export default class App extends Component<{}> {
  constructor(props) {
    super(props);

    this.state = {
      airShipStatus: false,
      isAirShipStarted: false,
      gimbalStatus: false,
      isGimbalStarted: false,
      consentRequirement: '--',
      userConsent: '--',
      appId: '--',
      errorMsg: '--',
      permissionIosAlways: true,
      permissionIosInUse: true,
      permissionDroidAccessFine: true,
      didRequestPermissions: false,
      isDebugLoggingEnabled: '--',
      isPlaceLoggingEnabled: '--',
      isBeaconSightingsLoggingEnabled: '--',
      lastVisitStartEvent: '--',
      lastVisitStartWithDelayEvent: '--',
      lastVisitEndEvent: '--',
      lastBeaconSightingEvent: '--',
      lastLocationDetectionEvent: '--',
      isMonitoringPlaces: false,
      placeListeners: [],
      beaconListeners: [],
      lastBeaconSightingEventFromBeaconManager: '--',
      isMonitoringEstablishedLocation: false,
      establishedLocationStatus: false,
      establishedLocations: [],
    };

    this.GIMBAL_APP_API_KEY = Platform.select({
      ios: () => 'YOUR_GIMBAL_IOS_API_KEY',
      android: () => 'YOUR_GIMBAL_ANDROID_API_KEY',
    })();

    UrbanAirship.setUserNotificationsEnabled(true);
  };

  componentDidMount() {
    this.checkPermissionState();
  }

  componentWillUnmount() {
    this.unsetPlaceListeners();
  }

  // Permissions
  isPermissionsGranted() {
    this.checkPermissionState();

    if (Platform.OS === Constants.IOS) {
      return this.state.permissionIosInUse && this.state.permissionIosAlways;
    }
    else if (Platform.OS === Constants.ANDROID) {
      return this.state.permissionDroidAccessFine;
    }
    else {
      this.renderError(Constants.UNKNOWN_PLATFORM);
      return;
    }
  };

  checkPermissionState = async () => {
    try {
      if (Platform.OS === Constants.IOS) {
        const locationAlwaysPermissionState = await check(PERMISSIONS.IOS.LOCATION_ALWAYS);
        const locationWhenInUsePermissionState = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);

        this.setState({
          permissionIosAlways: locationAlwaysPermissionState === RESULTS.GRANTED,
          permissionIosInUse: locationWhenInUsePermissionState === RESULTS.GRANTED
        });
      } else if (Platform.OS === Constants.ANDROID) {
        const accessFineLocationPermissionState = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

        this.setState({
          permissionDroidAccessFine: accessFineLocationPermissionState === RESULTS.GRANTED
        });
      } else {
        throw Constants.UNKNOWN_PLATFORM;
      }
    } catch (err) {
      this.renderError(`Error checking permission status: ${err}`);
    }
  };

  requestPermissions = async () => {
    if (Platform.OS === Constants.IOS) {
      const locationAlwaysPermissionState = await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
      const locationWhenInUsePermissionState = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);

      this.setState({
        permissionIosAlways: locationAlwaysPermissionState === RESULTS.GRANTED,
        permissionIosInUse: locationWhenInUsePermissionState === RESULTS.GRANTED
      })
    } else if (Platform.OS === Constants.ANDROID) {
      const accessFineLocationPermissionState = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

      this.setState({
        permissionDroidAccessFine: accessFineLocationPermissionState === RESULTS.GRANTED
      });
    } else {
      this.renderError(Constants.UNKNOWN_PLATFORM);
    };

    this.setState({ didRequestPermissions: true });
  };

  // Airship Adapter
  startAirShip = async () => {
    const permissionsGranted = await this.isPermissionsGranted();
    if (!permissionsGranted) {
      this.requestPermissions();
      return;
    }

    this.setAirshipNotificationConfiguration();

    try {
      const status = await AirshipGimbalAdapter.start(this.GIMBAL_APP_API_KEY);

      this.setState({ airShipStatus: status });
    } catch (err) {
      this.renderError(`Error starting AirShip: ${err}`);
    }
  };

  isAirShipAdapterStarted = async () => {
    try {
      const isStart = await AirshipGimbalAdapter.isStarted();

      this.setState({ isAirShipStarted: isStart });
    } catch (err) {
      this.renderError(`Cannot start AirShip: ${err}`);
    }
  };

  stopAirShip = () => {
    AirshipGimbalAdapter.stop();

    this.setState({ airShipStatus: false });
  };

  setAirshipNotificationConfiguration = () => {
    let configurationMethod = Platform.select({
      ios: () => {
        UrbanAirship.setForegroundPresentationOptions({
          alert: true,
          badge: true,
          sounds: true
        });
      },
      android: () => UrbanAirship.setAndroidNotificationConfig({})
    });

    configurationMethod();
  };

  // Gimbal module
  startGimbal = () => {
    if (!this.isPermissionsGranted()) {
      this.requestPermissions();
      return;
    };

    RNGimbal.start();

    this.setState({ gimbalStatus: true });
  };

  isGimbalSDKStarted = async () => {
    try {
      const isStart = await RNGimbal.isStarted();

      this.setState({ isGimbalStarted: isStart });
    } catch (err) {
      this.renderError(`Cannot start Gimbal SDK: ${err}`);
    }
  };

  getAppInstanceIdentifier = async () => {
    try {
      const res = await RNGimbal.getApplicationInstanceIdentifier();

      this.setState({ appId: res });
    } catch (err) {
      this.renderError(`Cannot get app instance identifier: ${err}`);
    }
  };

  stopGimbal = () => {
    RNGimbal.stop();

    this.setState({ gimbalStatus: false });
  };

  setConsent = stateValue => {
    PrivacyManager.setUserConsent(PrivacyManager.GDPR_CONSENT_TYPE_PLACES, stateValue);
  };

  getConsent = async () => {
    try {
      const consentState = await PrivacyManager.getUserConsent(PrivacyManager.GDPR_CONSENT_TYPE_PLACES);

      switch (consentState) {
        case PrivacyManager.GDPR_CONSENT_STATE_GRANTED:
          this.setState({ userConsent: 'Granted' });
          break;
        case PrivacyManager.GDPR_CONSENT_STATE_REFUSED:
          this.setState({ userConsent: 'Refused' });
          break;
        case PrivacyManager.GDPR_CONSENT_STATE_UNKNOWN:
          this.setState({ userConsent: 'Unknown' });
          break;
        default:
          this.setState({ userConsent: '--' });
      }
    } catch (err) {
      this.renderError(`Error getting user consent: ${err}`);
    }
  };

  getConsentRequirement = async () => {
    try {
      const requirement = await PrivacyManager.getGdprConsentRequirement();

      switch (requirement) {
        case PrivacyManager.GDPR_CONSENT_REQUIRED:
          this.setState({ consentRequirement: 'Required' });
          break;
        case PrivacyManager.GDPR_CONSENT_NOT_REQUIRED:
          this.setState({ consentRequirement: 'Not Required' });
          break;
        case PrivacyManager.GDPR_CONSENT_REQUIREMENT_UNKNOWN:
          this.setState({ consentRequirement: 'Unknown' });
          break;
        default:
          this.setState({ consentRequirement: '--' });
      }
    } catch (err) {
      this.renderError(`Error getting consent requirement: ${err}`);
    }
  };

  // Gimbal Debugger
  enableDebugLogging = () => {
    GimbalDebugger.enableDebugLogging();

    this.checkIfDebugLoggingEnabled();
  };

  disableDebugLogging = () => {
    GimbalDebugger.disableDebugLogging();

    this.checkIfDebugLoggingEnabled();
  };

  checkIfDebugLoggingEnabled = async () => {
    try {
      const isEnabled = await GimbalDebugger.isDebugLoggingEnabled();

      this.setState({ isDebugLoggingEnabled: isEnabled });
    } catch (err) {
      this.renderError(`Error checking Debug logging: ${err}`);
    }
  };

  enablePlaceLogging = () => {
    GimbalDebugger.enablePlaceLogging();

    this.checkIfPlaceLoggingEnabled();
  };

  disablePlaceLogging = () => {
    GimbalDebugger.disablePlaceLogging();

    this.checkIfPlaceLoggingEnabled();
  };

  checkIfPlaceLoggingEnabled = async () => {
    try {
      const isEnabled = await GimbalDebugger.isPlaceLoggingEnabled();
      this.setState({ isPlaceLoggingEnabled: isEnabled });
    } catch (err) {
      this.renderError(`Error checking Place logging: ${err}`);
    }
  };

  enableBeaconSightingsLogging = () => {
    GimbalDebugger.enableBeaconSightingsLogging();

    this.checkIfBeaconSightingsLoggingEnabled();
  };

  disableBeaconSightingsLogging = () => {
    GimbalDebugger.disableBeaconSightingsLogging();

    this.checkIfBeaconSightingsLoggingEnabled();
  };

  checkIfBeaconSightingsLoggingEnabled = async () => {
    try {
      const isEnabled = await GimbalDebugger.isBeaconSightingsLoggingEnabled();

      this.setState({ isBeaconSightingsLoggingEnabled: isEnabled });
    } catch (err) {
      this.renderError(`Error checking Beacon logging: ${err}`);
    }
  };

  // BeaconManager
  startMonitoringBeacons = () => {
    this.setBeaconListeners();
    BeaconManager.startListening();
  };

  stopMonitoringBeacons = () => {
    BeaconManager.stopListening();
    this.unsetBeaconListeners();
  };

  setBeaconListeners = () => {
    if (this.state.beaconListeners.length > 0) {
      return;
    }

    const beaconEventEmitter = new NativeEventEmitter(BeaconManager);

    const beaconSightingSubscription = beaconEventEmitter.addListener(
      BeaconManager.BEACON_SIGHTING,
      event => {
        console.log(`BeaconSighting (BeaconManager): ${JSON.stringify(event)}`);
        let rssi = event.rssi.toString();
        let visitArrivalTimeMillis = event.timeInMillis;
        let visitDate = new Date(visitArrivalTimeMillis);
        this.setState({
          lastBeaconSightingEventFromBeaconManager: `${rssi}, ${visitDate.toLocaleTimeString()}`
        });
      },
    );

    const beaconListeners = [beaconSightingSubscription];
    this.setState({ beaconListeners });
  };

  unsetBeaconListeners = () => {
    this.state.beaconListeners.forEach(listener => {
      listener.remove();
    });
    this.setState({ beaconListeners: [] });
  };

  // PlaceManager
  startMonitoringPlaces = () => {
    this.setPlaceListeners();
    PlaceManager.startMonitoring();
    this.isMonitoringPlaces();
  };

  stopMonitoringPlaces = () => {
    PlaceManager.stopMonitoring();
    this.unsetPlaceListeners();
    this.isMonitoringPlaces();
  };

  isMonitoringPlaces = async () => {
    let isMonitoringPlaces = await PlaceManager.isMonitoring();
    this.setState({ isMonitoringPlaces });
  };

  setPlaceListeners() {
    if (this.state.placeListeners.length > 0) {
      return;
    }

    const placeEventEmitter = new NativeEventEmitter(PlaceManager);

    const visitStartSubscription = placeEventEmitter.addListener(
      'VisitStart',
      visit => {
        console.log(`VisitStart: ${JSON.stringify(visit)}`);
        this.setState({ lastVisitStartEvent: visit.visitId });
      },
    );

    const visitStartWithDelaySubscription = placeEventEmitter.addListener(
      'VisitStartWithDelay',
      visit => {
        console.log(`VisitStartWithDelay: ${JSON.stringify(visit)}`);
        this.setState({ lastVisitStartWithDelayEvent: visit.delay });
      },
    );

    const visitEndSubscription = placeEventEmitter.addListener(
      'VisitEnd',
      visit => {
        console.log(`VisitEnd: ${JSON.stringify(visit)}`);
        this.setState({ lastVisitEndEvent: visit.visitId });
      },
    );

    const beaconSightingSubscription = placeEventEmitter.addListener(
      PlaceManager.BEACON_SIGHTING,
      visit => {
        console.log(`BeaconSighting (PlaceManager): ${JSON.stringify(visit)}`);
        let rssi = visit.beaconSighting.rssi.toString();
        let visitArrivalTimeMillis = visit.beaconSighting.timeInMillis;
        let visitDate = new Date(visitArrivalTimeMillis);
        this.setState({ lastBeaconSightingEvent: `${rssi}, ${visitDate.toLocaleTimeString()}` });
      },
    );

    const locationDetectedSubscription = placeEventEmitter.addListener(
      'LocationDetected',
      visit => {
        console.log(`LocationDetected: ${JSON.stringify(visit)}`);
        let latitudeString = `${visit.latitude}`.slice(0, 9);
        let longitudeString = `${visit.longitude}`.slice(0, 9);
        this.setState({ lastLocationDetectionEvent: `${latitudeString}, ${longitudeString}` });
      },
    );

    const placeListeners = [
      visitStartSubscription,
      visitStartWithDelaySubscription,
      visitEndSubscription,
      beaconSightingSubscription,
      locationDetectedSubscription,
    ];

    this.setState({ placeListeners });
  }

  unsetPlaceListeners = () => {
    this.state.placeListeners.forEach(listener => {
      listener.remove();
    });
    this.setState({ placeListeners: [] });
  };

  checkPlaceMonitoringState = async () => {
    let isMonitoringPlaces = await PlaceManager.isMonitoring();
    if (isMonitoringPlaces) {
      this.setPlaceListeners();
    }
    this.setState({ isMonitoringPlaces });
  };

  // Established Location
  startEstablishedLocationMonitoring = () => {
    EstablishedLocationsManager.startMonitoring();

    this.setState({ isMonitoringEstablishedLocation: true });
  };

  stopEstablishedLocationMonitoring = () => {
    EstablishedLocationsManager.stopMonitoring();

    this.setState({ isMonitoringEstablishedLocation: false });
  };

  establishedLocationStatus = async () => {
    let status = await EstablishedLocationsManager.isMonitoring();

    this.setState({ establishedLocationStatus: status });
  };

  getEstablishedLocations = async () => {
    let loc = await EstablishedLocationsManager.getEstablishedLocations();

    this.setState({ establishedLocations: loc });
  };

  renderError(msg) {
    this.setState({ errorMsg: msg }, () => {
      setTimeout(() => {
        this.setState({ errorMsg: '' });
      }, 3000);
    });
  };

  render() {
    return (
      <ScrollView>
        <SafeAreaView style={styles.container}>
          <View style={styles.divider}></View>
          <Text style={styles.welcome}>☆ Airship DEMO ☆</Text>
          <Text style={styles.instructions}>Airship Status: {this.state.airShipStatus.toString()}</Text>
          <Text style={styles.instructions}>Airship Started? {this.state.isAirShipStarted.toString()}</Text>
          <View style={styles.hr}></View>
          <View style={styles.row}>
            <Button title='Start' onPress={this.startAirShip} />
            <Button title='Stop' onPress={this.stopAirShip} />
            <Button title='Started?' onPress={this.isAirShipAdapterStarted} />
          </View>

          <View style={styles.divider}></View>
          <Text style={styles.welcome}>☆ RNGimbal DEMO ☆</Text>
          <Text style={styles.instructions}>Gimbal Status: {this.state.gimbalStatus.toString()}</Text>
          <Text style={styles.instructions}>Gimbal Started? {this.state.isGimbalStarted.toString()}</Text>
          <Text style={styles.instructions}>App ID: {this.state.appId}</Text>
          <View style={styles.hr}></View>
          <View style={styles.row}>
            <Button title='Start' onPress={this.startGimbal} />
            <Button title='Stop' onPress={this.stopGimbal} />
            <Button title='Started?' onPress={this.isGimbalSDKStarted} />
          </View>
          <View style={styles.hr}></View>
          <View style={styles.row}>
            <Button title='App Identifier' onPress={this.getAppInstanceIdentifier} />
          </View>

          <View style={styles.divider}></View>
          <Text style={styles.welcome}>☆ RNGimbal Privacy DEMO ☆</Text>
          <Text style={styles.instructions}>Consent State: {this.state.userConsent}</Text>
          <Text style={styles.instructions}>Consent Requirement: {this.state.consentRequirement}</Text>
          <View style={styles.hr}></View>
          <View style={styles.row}>
            <Button title='Grant' onPress={() => this.setConsent(PrivacyManager.GDPR_CONSENT_STATE_GRANTED)} />
            <Button title='Refuse' onPress={() => this.setConsent(PrivacyManager.GDPR_CONSENT_STATE_REFUSED)} />
            <Button title='State?' onPress={this.getConsent} />
          </View>
          <View style={styles.hr}></View>
          <View style={styles.row}>
            <Button title='Consent Requirement' onPress={this.getConsentRequirement} />
          </View>

          <View style={styles.divider}></View>
          <Text style={styles.welcome}>☆ GimbalDebugger DEMO ☆</Text>
          <Text style={styles.instructions}>Debug Logging Enabled? {this.state.isDebugLoggingEnabled.toString()}</Text>
          <View style={styles.row}>
            <Button title='Debug On' onPress={this.enableDebugLogging} />
            <Button title='Debug Off' onPress={this.disableDebugLogging} />
            <Button title='Is Enabled?' onPress={this.checkIfDebugLoggingEnabled} />
          </View>
          <View style={styles.hr}></View>
          <Text style={styles.instructions}>Place Logging Enabled? {this.state.isPlaceLoggingEnabled.toString()}</Text>
          <View style={styles.row}>
            <Button title='Place On' onPress={this.enablePlaceLogging} />
            <Button title='Place Off' onPress={this.disablePlaceLogging} />
            <Button title='Is Enabled?' onPress={this.checkIfPlaceLoggingEnabled} />
          </View>
          <View style={styles.hr}></View>
          <Text style={styles.instructions}>Beacon Logging Enabled? {this.state.isBeaconSightingsLoggingEnabled.toString()}</Text>
          <View style={styles.row}>
            <Button title='Beacon On' onPress={this.enableBeaconSightingsLogging} />
            <Button title='Beacon off' onPress={this.disableBeaconSightingsLogging} />
            <Button title='Is Enabled?' onPress={this.checkIfBeaconSightingsLoggingEnabled} />
          </View>

          <View style={styles.divider}></View>
          <Text style={styles.welcome}>☆ RNGimbal Place Manager DEMO ☆</Text>
          <Text style={styles.instructions}>Visit ID: {this.state.lastVisitStartEvent.toString()}</Text>
          <Text style={styles.instructions}>Visit delay: {this.state.lastVisitStartWithDelayEvent.toString()}</Text>
          <Text style={styles.instructions}>Visit End ID: {this.state.lastVisitEndEvent.toString()}</Text>
          <Text style={styles.instructions}>Beacon sighting: {this.state.lastBeaconSightingEvent.toString()}</Text>
          <Text style={styles.instructions}>Location detected: {this.state.lastLocationDetectionEvent.toString()}</Text>
          <Text style={styles.instructions}>Is Monitoring: {this.state.isMonitoringPlaces.toString()}</Text>
          <View style={styles.row}>
            <Button title='Start' onPress={this.startMonitoringPlaces} />
            <Button title='Stop' onPress={this.stopMonitoringPlaces} />
            <Button title='Monitoring?' onPress={this.isMonitoringPlaces} />
          </View>

          <View style={styles.divider}></View>
          <Text style={styles.welcome}>☆ RNGimbal Beacon Manager DEMO ☆</Text>
          <Text style={styles.instructions}>
            Beacon sighting: {this.state.lastBeaconSightingEventFromBeaconManager}
          </Text>
          <View style={styles.row}>
            <Button title='Start' onPress={this.startMonitoringBeacons} />
            <Button title='Stop' onPress={this.stopMonitoringBeacons} />
          </View>

          <View style={styles.divider}></View>
          <Text style={styles.welcome}>☆ Established Locations ☆</Text>
          <Text style={styles.instructions}>EstLoc Status: {this.state.isMonitoringEstablishedLocation.toString()}</Text>
          <Text style={styles.instructions}>EstLoc Started? {this.state.establishedLocationStatus.toString()}</Text>
          <Text style={styles.instructions}>EstLocations: </Text>
          <View>
            {this.state.establishedLocations.map((loc, index) => (
              <View key={index} style={styles.establishedLocation}>
                <Text key={index + 'score'}>score: {Math.round(loc.score)}</Text>
                <Text key={index + 'radius'}>radius: {Math.round(loc.boundaryRadius * 100) / 100}</Text>
                <Text key={index + 'lat'}>lat: {Math.round(loc.boundaryCenterLatitude * 1000000) / 1000000}</Text>
                <Text key={index + 'lon'}>lon: {Math.round(loc.boundaryCenterLongitude * 1000000) / 1000000}</Text>
              </View>
            ))}
          </View>
          <View style={styles.hr}></View>
          <View style={styles.row}>
            <Button title='Start' onPress={this.startEstablishedLocationMonitoring} />
            <Button title='Stop' onPress={this.stopEstablishedLocationMonitoring} />
            <Button title='Started?' onPress={this.establishedLocationStatus} />
            <Button title='Get EstLoc' onPress={this.getEstablishedLocations} />
          </View>

          <View style={styles.divider} />
          <Text style={styles.error}>{this.state.errorMsg}</Text>
        </SafeAreaView>
      </ScrollView>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    fontSize: 15,
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  row: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  hr: {
    borderBottomColor: 'orange',
    borderBottomWidth: 1,
    marginBottom: 5,
    marginTop: 5,
    width: '80%',
  },
  divider: {
    borderTopColor: 'purple',
    borderTopWidth: 4,
    marginBottom: 5,
    marginTop: 5,
    width: '90%',
  },
  error: {
    textAlign: 'center',
    color: 'red',
    marginBottom: 5,
  },
  establishedLocation: {
    borderColor: 'purple',
    borderWidth: 1,
    padding: 1,
  },
});
