# Canopy Clone Login Test

## Test Name
Canopy Clone Login

## Description
This test automates the login flow to the Helpthemove Admin Portal using Google SSO authentication.

## Test Environment
- **Application**: Helpthemove Admin (Canopy Clone)
- - **URL**: https://admin-canopy-clone.helpthemove.co.uk/login
  - - **Auth Method**: Google SSO
   
    - ## Test Steps
   
    - ### Step 1: Navigate to Login Page
    - - Navigate to the Admin Portal login page
      - - Expected Result: Login page displays with "Sign in with Google" button
       
        - ### Step 2: Click Google SSO Button
        - - Click the "Sign in with Google" button
          - - Expected Result: Redirected to Google account selection page
           
            - ### Step 3: Select Account
            - - Click on the account: **mac.murapa@helpthemove.co.uk**
              - - Expected Result: Account is selected for authentication
               
                - ### Step 4: Complete Authentication
                - - Complete the Google OAuth flow
                  - - Expected Result: User is authenticated and redirected to Admin Dashboard
                   
                    - ## Expected Outcome
                    - - Successful login to the admin portal
                      - - User redirected to Admin Homepage
                        - - Dashboard displays Council Web Notifications section
                         
                          - ## Test Date
                          - - Executed: 2025-03-03
                            - - Test Account: mac.murapa@helpthemove.co.uk
                              - - SSO Provider: Google
                               
                                - ## Status
                                - ✅ PASSED
                               
                                - ## Notes
                                - - Test confirms successful Google SSO integration
                                  - - Login flow is functioning correctly
                                    - - Dashboard loads after successful authentication
                                     
                                      - ---

                                      ## Recording
                                      Screen recording of the test flow available in the project assets folder.
                                      Test ID: Canopy_Clone_Login_001
