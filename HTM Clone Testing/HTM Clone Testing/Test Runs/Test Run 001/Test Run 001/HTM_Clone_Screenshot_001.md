# HTM Clone Screenshot Test - HTM_Clone_Screenshot_001

## Test Objective
Verify that the HTM Clone instance is accessible and capture a screenshot of the landing page.

## Environment
- **System**: HTM Clone (HelpTheMove Admin Clone)
- **URL**: https://admin-clone.helpthemove.co.uk
- **Test Date**: 16/03/2026
- **Tester**: Automated Test Run
- **Test ID**: HTM_Clone_Screenshot_001
- **Tool**: Playwright CLI (Chromium)
- **Version Captured**: 6.5.3

## Test Steps

### Step 1: Launch Playwright
- Use Playwright CLI with Chromium browser to navigate to the HTM Clone instance

### Step 2: Navigate to HTM Clone
- Navigate to https://admin-clone.helpthemove.co.uk/

### Step 3: Capture Screenshot
- Wait for `domcontentloaded` event
- Take full viewport screenshot

## Expected Result
The HTM Clone login page should load successfully displaying the HelpTheMove Admin Portal Login screen.

## Actual Result
✅ **PASS** - The HTM Clone login page loaded successfully displaying:
- HelpTheMove branding and logo
- "Admin Portal Login" heading
- "Sign in with Google" button
- Version: 6.5.3

## Screenshot
![HTM Clone Login Page](HTM_Clone_Screenshot_001.png)

## Notes
- SSL certificate errors were ignored (`ignoreHTTPSErrors: true`) as expected for clone environments
- Page loaded successfully via the environment proxy
- Login page is functional and ready for authentication testing

## Test Status
✅ **PASS**
