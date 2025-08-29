========================================================================
 AI / LLM AGENT INSTRUCTIONS
========================================================================
Very Important Core Architectural Pattern is the existing Finite State Machine (FSM)
 
This plugin uses an FSM to manage all core business logic and ensure
data integrity. Do not bypass the FSM.
 
To change an object's state, apply a transition.
To perform a CRUD action, tie it to a transition's side-effect.

Your primary task is to read, understand, and extend the existing
FSM definition when adding or modifying functionality.

Please use the existing FSM. If you suggest/recommend creating a new one,
feel free to recommend it to the user.

There should be a total of only 1 FSM PHP for the backend and 1 FSM JS for the frontend.
 
Please do not refactor anything beyond the scope of the immediate tasks. Please do not change any labels unless explicitly instructed. Please keep the TOC, increment the version number for each change, and add to the existing changelog within the code. Please try your best to adhere to DRY principles so we can re-use existing functions or better yet re-use WP core functions or API calls. 