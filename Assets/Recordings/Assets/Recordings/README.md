# QA Testing Assets - Recordings

This folder contains all screen recordings and GIF files for QA test automation.

## Folder Structure

```
Assets/
├── Recordings/
│   ├── Canopy_Clone_Login_001.gif
│   ├── Canopy_Clone_[TestName]_[Number].gif
│   └── README.md (this file)
```

## Naming Convention

All recording files should follow the naming pattern:
```
[Project]_[TestName]_[TestNumber].gif
```

Example:
- `Canopy_Clone_Login_001.gif` - First test run of Canopy Clone Login
- - `Canopy_Clone_Login_002.gif` - Second test run of Canopy Clone Login
  - - `Canopy_Clone_Forms_001.gif` - First test run of Canopy Clone Forms
   
    - ## Recording Guidelines
   
    - 1. **Test Identification**: Each recording is numbered sequentially (001, 002, etc.)
      2. 2. **File Format**: GIF format for easy viewing and sharing
         3. 3. **Documentation**: Link recordings in the corresponding test documentation file under `/Canopy/Canopy/`
            4. 4. **Organization**: Organize recordings by project and test type
              
               5. ## How to Reference Recordings
              
               6. In your test documentation file (e.g., `Canopy_Clone_Login.md`), reference the recording like this:
              
               7. ```
                  ## Recording
                  Screen recording of the test flow: [Canopy_Clone_Login_001.gif](../../Assets/Recordings/Canopy_Clone_Login_001.gif)
                  Test ID: Canopy_Clone_Login_001
                  ```

                  ## Test Recording Details

                  ### Canopy Clone Login
                  - **Test ID**: Canopy_Clone_Login_001
                  - - **File**: Canopy_Clone_Login_001.gif
                    - - **Description**: Login flow using Google SSO authentication
                      - - **Test Date**: 2025-03-03
                        - - **Status**: ✅ PASSED
