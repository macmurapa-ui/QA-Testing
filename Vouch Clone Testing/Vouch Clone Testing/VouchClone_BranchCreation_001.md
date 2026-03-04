# Vouch Clone Branch Creation Test - VouchClone_BranchCreation_001

## Test Objective
Verify that a new branch can be successfully created in the Vouch Clone Utilities admin system with all required details.

## Environment
- **System**: Vouch Clone
- - **URL**: https://admin-utilities-clone.helpthemove.co.uk
  - - **Test Date**: 04/03/2026
    - - **Tester**: Automated Test Run
      - - **Test ID**: VouchClone_BranchCreation_001
       
        - ## Test Steps
       
        - ### Step 1: Access Utilities/Vouch Clone Admin Page
        - - Navigate to admin-utilities-clone.helpthemove.co.uk/login
         
          - ### Step 2: Click Sign in with Google
          - - Click the "Sign in with Google" button on the login page
           
            - ### Step 3: Select Mac Murapa Help the Move Account
            - - Select account: mac.murapa@helpthemove.co.uk from the account chooser
             
              - ### Step 4: Navigate to Organisations and Branches
              - - Once logged in, click on "Organisations" in the menu
                - - Click on "Branches" submenu
                 
                  - ### Step 5: Click Add Branch
                  - - Click the "Add Branch" button to open the branch creation form
                   
                    - ### Step 6: Fill in Branch Details
                    - - **Branch Name**: Mac 040326
                      - - **Business Type**: Letting Agent
                        - - **Phone Number**: 0743866811
                          - - **Post Code**: M13 9JD
                            - - **Address Line 1**: 28 Haymarket Street
                              - - **Address Line 2**: Grove Village
                                - - **City**: Manchester
                                  - - **County**: Lancashire
                                   
                                    - ### Step 7: Save Branch
                                    - - Click the "Save" button to create the branch
                                     
                                      - ## Expected Result
                                      - The branch "Mac 040326" should be successfully created with all the specified details saved in the system.
                                     
                                      - ## Actual Result
                                      - ✅ **PASS** - Branch creation was successful. A green notification "Branch created" was displayed confirming the successful creation of the branch with all specified details.
                                     
                                      - ## Screenshots
                                      - - Success page showing "Branch created" notification captured
                                       
                                        - ## Notes
                                        - - Test completed successfully without any errors or validation issues
                                          - - All required fields were properly filled and accepted by the system
                                            - - The system returned to the Admin Homepage after successful creation
                                              - - This test serves as a baseline for future branch creation tests across different environments (Vouch, Canopy, Let Alliance, etc.)
                                               
                                                - ## Future Test Variants
                                                - This test template can be reused for:
                                                - - Canopy Clone Branch Creation Tests
                                                  - - Let Alliance Branch Creation Tests
                                                    - - Vouch Production Branch Creation Tests
                                                      - - Other property management systems
                                                        - - Simply update the environment details and system credentials as needed
