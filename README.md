# Focspoint plugin for CrafterCMS Studio

## Installation

Install the plugin via Crafter Studio's Plugin Management UI under "Project Tools" > "Plugin Management" > "Search & install".

Alternatively, you can download this repository and install the plugin using crafter-cli:

```bash
$ ./crafter-cli copy-plugin -e {ENVIRONMENT} --path /path/to/repository/craftercms-focuspoint-plugin --siteId {SITE}
```

Replace all required form engine controls of type `image-picker` with the new control `imagic`.

The form control contains two properties FocusPoint.x and FocusPoint.y which set a default focus point in the images. These are relative 
float values from 0 to 1 in x- and y-axis which defines the position from top/left to bottom/right. If no values are set, the default
focus point position is in the image center. 
