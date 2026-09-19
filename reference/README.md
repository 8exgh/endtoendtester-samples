# Reference-only samples

Everything else in this repository runs in CI on every push. These four do
not, and the reason is the same each time: they need hardware or a licensed
platform a Linux runner does not have.

| Sample | Needs | Article |
|---|---|---|
| `tools/appium` | a device or emulator plus an Appium server | [Appium](https://endtoendtester.com/tools/appium) |
| `platforms/desktop-testing` | Windows and a real desktop session | [Desktop testing](https://endtoendtester.com/platforms/desktop-testing) |
| `platforms/ios-app-testing` | macOS and Xcode | [iOS testing](https://endtoendtester.com/platforms/ios-app-testing) |
| `platforms/android-app-testing` | the Android SDK and an emulator | [Android testing](https://endtoendtester.com/platforms/android-app-testing) |

They are written to be copied and run on a machine that has what they need,
and they are deliberately not stubbed into something that would pass on a
runner while proving nothing.

Two of the four have a runnable counterpart elsewhere in the repository,
which is worth knowing before reaching for a device farm:

- **Desktop** — [`dotnet/Tests.Avalonia`](../dotnet/Tests.Avalonia) runs real
  desktop UI tests headlessly on Linux, in milliseconds. If you are choosing
  a .NET desktop stack and testability matters, that is the point.
- **Android/iOS logic** — the [Flutter samples](../flutter) run widget tests
  on any runner with no emulator at all.
