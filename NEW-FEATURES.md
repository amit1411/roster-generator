## TODO NEXT


## BACKLOG

- Realtime sync with WebSockets
- Player replacement mid-session

## Completed Features

-  View-only vs scorer links with env variable ADMIN_RECOVERY_TOKEN
    - Should be tied to login and roles (admin)
- Tournament summary / results page
- Rename session
- Historical data and player stats
Requirements:
- Think about UX/UI best experience for the end user.
- Keep the routing and functionality to be compatible with render.com platform hosting. DOnt change routing if its too complex.
- Move Active Sessions to a new section/page to show existing sessions. Keep planner only for generating a new roster and starting sessions.
- Creat a new page for historical sessions. This should only have completed sessions to open the results with an optional delete button.
- New Player stats page with details about player statistics. The statistics should include both league and knockout stages stats.
- Update the E2E tests and run for all scenarios.