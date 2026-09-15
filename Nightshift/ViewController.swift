//
//  ViewController.swift
//  Nightshift
//
//  Created by Леша Маслаков on 3/23/20.
//  Copyright © 2020 Леша Маслаков. All rights reserved.
//

import Cocoa
import SafariServices.SFSafariApplication

class ViewController: NSViewController {

    private static let extensionIdentifier = "com.FlyMedia.Nightshift.Extension"

    @IBOutlet var appNameLabel: NSTextField!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        self.appNameLabel.stringValue = "Nightshift";
    }

    @IBAction func openSafariExtensionPreferences(_ sender: AnyObject?) {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: Self.extensionIdentifier) { error in
            if let _ = error {
                // Insert code to inform the user that something went wrong.
            }
        }
    }

}
