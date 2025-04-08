//
//  AppDelegate.h
//  typePop
//
//  Created by KimTaeseok on 2015. 11. 29..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import "TestMyController.h"

@interface TestAppDelegate : NSObject <NSApplicationDelegate>
{
    NSWindow* fullScreenWindow;
    NSView* fullScreenView;
    NSResponder<MyController>* myController;
}

@end

