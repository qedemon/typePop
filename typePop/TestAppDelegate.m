//
//  AppDelegate.m
//  typePop
//
//  Created by KimTaeseok on 2015. 11. 29..
//  Copyright © 2015년 KimTaeseok. All rights reserved.
//

#import "TestAppDelegate.h"
#import "MyOpenGLView.h"
#import "MyWindow.h"



@implementation TestAppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    NSRect mainDisplayRect, viewRect;
    mainDisplayRect=[[NSScreen mainScreen] frame];
    fullScreenWindow=[[MyWindow alloc] initWithContentRect:mainDisplayRect styleMask:NSBorderlessWindowMask backing:NSBackingStoreBuffered defer:YES];
    
    [fullScreenWindow setLevel:NSMainMenuWindowLevel+1];
    [fullScreenWindow setOpaque:YES];
    [fullScreenWindow setHidesOnDeactivate:YES];
    
    viewRect=NSMakeRect(0.0, 0.0, mainDisplayRect.size.width, mainDisplayRect.size.height);
    fullScreenView=[[MyOpenGLView alloc]initWithFrame:viewRect];
    myController=[[TestMyController alloc] init];
    [(TestMyController*) myController setTargetView:(MyOpenGLView*)fullScreenView];
    [(TestMyController*)myController startDisplay];
    [fullScreenWindow setContentView:fullScreenView];
    
    [fullScreenWindow makeKeyAndOrderFront:self];
    [fullScreenWindow makeMainWindow];
    [fullScreenWindow makeFirstResponder:fullScreenView];
}

- (void)applicationWillTerminate:(NSNotification *)aNotification {
    // Insert code here to tear down your application
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender{
    return YES;
}

@end
