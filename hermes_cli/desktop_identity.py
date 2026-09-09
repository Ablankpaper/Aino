"""Product-facing desktop identity and migration names.

The Python agent keeps its ``hermes`` command and module names for runtime
compatibility. These constants are only for locating or describing the
desktop application, where the shipped product is Aino. Hermes remains an
explicit legacy rung so an existing upstream installation can be upgraded or
removed safely.
"""

DESKTOP_PRODUCT_NAME = "Aino"
LEGACY_DESKTOP_PRODUCT_NAME = "Hermes"
DESKTOP_APP_ID = "com.ablankpaper.aino"
LEGACY_DESKTOP_APP_ID = "com.nousresearch.hermes"
