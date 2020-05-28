# React Native Gimbal-Airship Demo
## Getting Started
In https://manager.gimbal.com/apps create two Gimbal Applications, one each for Android and iOS.
For Android, enter `com.rngimbalairshipdemo` as the package ID; for iOS, enter `org.reactjs.native.example.RNGimbalAirshipDemo` as the bundle ID.
Note the respective API keys for Android and iOS--they will be used in the sections below.

Then, clone the React Native Gimbal SDK library: `github.com/PaeDae/react-native-gimbal-sdk`.

Next, from the demo app folder, install the React Native Gimbal SDK using its relative filepath.
* `yarn add path_to_cloned_gimbal_SDK`

Next, install react-native-permissions (for permission-handling) along with the necessary Airship libraries:
* `yarn add react-native-permissions`
* `yarn add urbanairship-react-native`  
* `yarn add urbanairship-gimbal-adapter-react-native`

Then, in `App.js`, located in the constructor of the `App` class is a property called `GIMBAL_APP_API_KEY`; fill in your iOS and Android API keys in the string placeholders titled `YOUR_GIMBAL_IOS_API_KEY` and `YOUR_GIMBAL_ANDROID_API_KEY` respectively.
### Android:
Create a file called `airshipconfig.properties` in the directory `app/src/main/assets` with the following contents:
```
developmentAppKey = Your Airship Development App Key
developmentAppSecret = Your Airship Development App Secret
productionAppKey = Your Airship Production App Key
productionAppSecret = Your Airship Production Secret
# Notification customization
notificationIcon = ic_notification
notificationAccentColor = #ff0000
```
### iOS:
Create a .plist file called `AirshipConfig.plist` and include it in your application’s target:
```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>developmentAppKey</key>
    <string>Your Airship Development App Key</string>
    <key>developmentAppSecret</key>
    <string>Your Airship Development App Secret</string>
    <key>productionAppKey</key>
    <string>Your Airship Production App Key</string>
    <key>productionAppSecret</key>
    <string>Your Airship Production App Secret</string>
</dict>
</plist>
```

### Final Steps:
Complete the Airship-recommended setup steps relevant to the desired functionalities, which can be found in the
[Airship React Native repo](https://github.com/urbanairship/react-native-module)
and
[Airship React Native Gimbal Adapter repo](https://github.com/urbanairship/react-native-gimbal-adapter)
.

Extra steps needed on React Native v0.60+:  
`cd ios && pod install && cd ..`  
## Running the App:
* Android: `yarn react-native run-android` or `npx react-native run-android`
* iOS: `yarn react-native run-ios` or `npx react-native run-ios`