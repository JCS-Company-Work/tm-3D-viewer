<?php

    namespace TmThreeViewer\ColourOptions;

    class TM3D_ColourOptionsData {

        /**
         * Fetches colour options from Google Sheets and caches the result.
         *
         * @param bool $bypassToken Whether to bypass token verification (internal calls)
         * @return \WP_REST_Response
         */
        public static function getDataFromGoogleSheets($bypassToken = false) {

            // Get expected token from environment variable
            $expected_token = $_ENV['TM3D_UPDATE_TOKEN'] ?? null;

            // Get provided token from request headers
            $provided_token = $_SERVER['HTTP_X_TM3D_TOKEN'] ?? null;

            // If not bypassing and expected token is set and does not match the provided token, return a 403 error
            if (!$bypassToken && (!$expected_token || $provided_token !== $expected_token)) {
                error_log('Invalid or missing token. Expected: ' . $expected_token . ', Provided: ' . $provided_token);
                return new \WP_Error('forbidden', 'Invalid or missing token', array('status' => 403));
            }

            try {

                // Fetch data from Google Sheets API using the Google API PHP Client
                require_once(TM3D_PATH . '/google-api-client/vendor/autoload.php');

                // Set up Google Client with credentials and cell ranges
                $client = new \Google_Client();
                $client->setApplicationName($_ENV['GOOGLE_APPLICATION_NAME'] ?? '');
                $client->setScopes([\Google_Service_Sheets::SPREADSHEETS]);
                $client->setAccessType('offline');
                $client->setAuthConfig(TM3D_PATH . ($_ENV['GOOGLE_PRIVATE_KEY_PATH'] ?? ''));
                $service = new \Google_Service_Sheets($client);
                $spreadsheetId = $_ENV['GOOGLE_SPREADSHEET_ID'] ?? '';

                // Specify tabs and ranges to pull from the spreadsheet
                $ranges = [
                    'tops!A:C',
                    'basecolours!A:C',
                    'horizontalbases!A:B',
                    'metalcolours!A:B',
                    'colouroptions!A:E',
                ];

                $response = $service->spreadsheets_values->batchGet($spreadsheetId, [
                    'ranges' => $ranges
                ]);

                $valueRanges = $response->getValueRanges();

                // Process the fetched data to build the colour options
                self::formatColourData($valueRanges);

            } catch (\Throwable $e) {
                error_log('TM3D Google Sheets error: ' . $e->getMessage());
            }

        }

        /**
         * Format colour data into correct structure
         *
         * @param array $valueRanges
         * @return void
         */
        public static function formatColourData($valueRanges) {

            // Array to hold final data
            $colour_options = [];

            // Build maps of colour name to ID for tops, bases and metals
            $maps = self::buildIDMaps($valueRanges);

            // Get the colour options data from the colour options tab and extract values
            $colourOptionsValues = self::getColourOptionValues($valueRanges);

            // Create master list for bases and metals containing ID and url
            $colour_options['master_values'] = self::addMasterList($colourOptionsValues['values'], $maps);

            // Add bases that need to be shown horizontally
            $colour_options['horizontal_bases'] = self::setHorizontalBases($valueRanges);

            // Ensure we have data and at least a header row before processing
            if(count($colourOptionsValues['values']) > 1) {

                // Loop through each row of data (skipping header) and build the colour options array
                foreach($colourOptionsValues['values'] as $row) {

                    // Skip incomplete rows
                    if (count($row) < 2) continue;

                    // Convert comma-separated values for base and metal values into arrays
                    $baseColours = self::convertToArray($row['Base Colours']);
                    $metalColours = self::convertToArray($row['Metal Colours']);

                    // Convert top colour value to correct format for object key. Must be array to allow for addition of WP attachment ID in the next step
                    $top_colour = [strtolower(trim($row['Top Colour']))];

                    // Create colour key name
                    $colour_key = strtolower(str_replace(' ', '_', trim($row['Top Colour'])));

                    // Array of colour groups to loop through for adding IDs, with corresponding map and image size for fetching URL
                    // We execute separate function calls to ensure that original arrays are updated with the new format (name, ID and URL)
                    self::addIDsToColours($top_colour, $maps['tops'], 'homeportrait');

                    // Only include entries where at least one of base or edge options is provided
                    if (!empty($baseColours) || !empty($metalColours)) {

                        // Extract top type value and convert to lowercase, hyphenated format for object key
                        $top_type_raw = trim($row['Top Type']);
                        $top_type = strtolower(str_replace('/', '-', $top_type_raw));

                        // Sub divide bases into wood and tile bases depending on whether the product is in the wood category (id 199)
                        $baseColours = self::filterDataByWoodCategory($baseColours);

                        // Build data array, base colours first as these are present for all top types
                        $data = [
                            'top' => $top_colour[0],
                            'base' => $baseColours
                        ];

                        // If top type is 'slim/edge', create data for both 'slim' and 'edge' keys with the same data
                        if (strtolower(str_replace(' ', '', $top_type_raw)) === 'slim/edge') {

                            // In the case of slim include bases only
                            $colour_options['slim']['colour_options'][$colour_key] = $data;

                            // In the case of edge include bases and edges
                            if (!empty($metalColours)) {
                                sort($metalColours);
                                $data['metal'] = $metalColours;
                            }

                            // In the case of edge include bases and edges
                            $colour_options['edge']['colour_options'][$colour_key] = $data;

                        } else {
                            // Store the processed data in the final array
                            $colour_options[$top_type]['colour_options'][$colour_key] = $data;
                        }

                    }

                }

                // Create over master transient containing all values for use in 3D viewer shortcode
                set_transient('tm3d_colour_options_all', $colour_options, 2592000);

            }

        }

        /**
         * Filter bases depending on whether product is in wood category (id 199)
         *
         * @param array $bases Array of base colour names to filter
         * @return array Returns the filtered product data with either wood or tile bases and corresponding colour options based on the product category
         */
        private static function filterDataByWoodCategory($bases) {

            // Define wood base options
            $woodBaseOptions = [
                'american walnut',
                'jet black'
            ];

            // Loop over bases and assign type
            $categorizedBases = [
                'wood' => [],
                'tile' => []
            ];

            foreach ($bases as $base) {
                if(in_array($base, $woodBaseOptions, true)) {
                    $categorizedBases['wood'][] = $base;
                } else {
                    $categorizedBases['tile'][] = $base;
                }
            }

            // Sort the categorized bases alphabetically for easier use in popout drawers
            foreach ($categorizedBases as &$baseGroup) {
                sort($baseGroup);
            }

            // Return the categorized bases array
            return $categorizedBases;
        }   

        /**
         * Extract data from colour options Google Sheets tab
         *
         * @param array $valueRanges Array of value ranges returned from Google Sheets API batchGet, containing data for all requested tabs
         * @return array Returns array of colour options values from the relevant tab in Google Sheets
         */
        public static function getColourOptionValues($valueRanges) {

            // Get the colour options data from the relevant tab
            $colourOptionsRange = array_filter($valueRanges, function($vr) {
                return strpos(strtolower($vr->getRange()), 'colouroptions') === 0;
            });

            // Remove data end values from header and all rows
            $colourOptionsRange = self::removeDataEndValues($colourOptionsRange);

            // If we have colour options data, process it to build the final colour options array
            $values = array_values($colourOptionsRange);

            // Return values if we have them in the expected format 
            if (!empty($values) && is_object($values[0]) && method_exists($values[0], 'getValues')) {
                
                $colourOptionsValues = $values[0]->getValues();

                // Create associative array of data and return
                return self::createAssocArrayFromValues($colourOptionsValues);
            } else {
                // If we don't have the expected data, return an empty array or handle as needed
                return [];
            }


        }

        /**
         * Convert data to associative array
         *
         * @param array $valueRanges
         * @return array
         */
        public static function createAssocArrayFromValues($valueRanges) {

            // Extract headers from the first row
            $headers = $valueRanges[0];

            // Combine headers and values to give assoc array for easy access to values
            $combined_rows = array_map(function($row) use ($headers) {
                return array_combine($headers, $row);
            }, array_slice($valueRanges, 1));

            // Return the combined array of data
            return [
                'headers' => $headers,
                'values' => $combined_rows
            ];

        }


        /**
         * Remove 'Data End' values from headers and rows in the provided value ranges
         *
         * @param array $valueRanges Array of value ranges returned from Google Sheets API batchGet, containing data for all requested tabs
         * @return array Returns the modified value ranges with 'Data End' values removed
         */
        public static function removeDataEndValues($valueRanges) {

            // Loop through each value range and remove 'Data End' values from headers and rows
            foreach($valueRanges as $valueRange) {

                // Get values for this range
                $values = $valueRange->getValues();

                // If we have values and at least a header row, look for 'Data End' and remove it from the header and all rows
                if(count($values) > 1) {

                    // Extract headers from the first row
                    $headers = array_map('trim', $values[0]);

                    // Find the index of the 'Data End' column, if it exists
                    $dataEndIndex = array_search('Data End', $headers);

                    // If we have a 'Data End' column, remove it from the headers and all rows
                    if ($dataEndIndex !== false) {
                        
                        // Remove 'Data End' from headers
                        unset($headers[$dataEndIndex]);

                        // Remove 'Data End' value from each row
                        foreach ($values as &$row) {
                            if (isset($row[$dataEndIndex])) {
                                unset($row[$dataEndIndex]);
                            }
                        }

                        // Update the value range with the modified values
                        $valueRange->setValues($values);
                    }
                }
            }

            // Return the modified value ranges
            return $valueRanges;

        }

         /**
         * Normalize a value by converting to lowercase and optionally replacing spaces with a specified character
         *
         * @param string $value The value to normalize
         * @param string|null $space_replace Optional character to replace spaces with (e.g. '_'), or null to leave spaces unchanged
         * @return string Returns the normalized value
         */

        /**
         * Create maps from GSheets data to give colour its correspoding WP attachment ID
         *
         * @param array $valueRanges
         * @return array
         */
        public static function buildIDMaps($valueRanges) {

            // Build maps of colour name to ID for tops, bases and metals
            $maps = [];

            foreach($valueRanges as $valueRange) {

                $map = [];

                // array to hold names of tabs to map
                $tabsToMap = ['tops', 'basecolours', 'metalcolours'];

                // Get the range name (e.g. 'tops', 'basecolours', 'metalcolours')
                $range = $valueRange->getRange();

                // Extract the tab name from the range (assuming format 'tab!A:B')
                preg_match('/^([^!]+)!/', $range, $matches);

                // If we have a match, process this range to build the map
                $range_name = strtolower($matches[1]) ?? null;

                // Only build maps for the specified tabs
                if ($range_name && in_array($range_name, $tabsToMap)) {

                    $values = $valueRange->getValues();

                    // Skip the header row and build a map of name to ID
                    foreach (array_slice($values, 1) as $row) {

                        // Extract name and lowercase
                        $name = strtolower(trim($row[0]));
                        
                        // Extract ID
                        $id = trim($row[1]);
                        
                        // Add to map
                        $map[$name]['id'] = $id;

                        // Add sample id to map
                        if (isset($row[2])) {
                            $map[$name]['sample_id'] = trim($row[2]);
                        }

                    }

                    $maps[$range_name] = $map;
                }

            }

            // Return final array
            return $maps;

        }

        /**
         * Add corresponding WP attachment IDs to colour options based on provided maps
         * We affect the actual colour options array by reference to avoid needing to return it
         *
         * @param array $colours
         * @param array $map
         * @param string $size
         * @return void
         */
        public static function addIDsToColours(array &$colours, $map, $size) {

            // Loop through the colours and if we have a corresponding ID in the map, 
            // replace the colour value with an array containing the name, ID and URL for the image
            foreach($colours as &$colour) {

                // Ensure colour is in the correct format (lowercase, trimmed) to match the map keys
                if (isset($map[$colour])) {

                    // Get attachment ID from map
                    $attachment_id = $map[$colour]['id'] ?? null;

                    $sample_id = $map[$colour]['sample_id'] ?? null;

                    // Get image URL from attachment ID and specified size
                    $image = $attachment_id
                        ? wp_get_attachment_image_src($attachment_id, $size, false)
                        : false;

                    $thumb = $attachment_id
                        ? wp_get_attachment_image_src($attachment_id, 'samplesthumb', false)
                        : false;

                    // Replace colour value with array containing name, ID and URL for image
                    $colour = [
                        'name' => $colour,
                        'slug' => str_replace(' ', '_', $colour),
                        'id'   => $attachment_id,
                        'sample_id' => $sample_id,
                        'url'  => $image[0] ?? null,
                        'thumb_url' => $thumb[0] ?? null,
                    ];

                }
            }
        }

        /**
         * Add master list of unique values for each top type to the colour options data, 
         * to be used for populating popout drawer options and ensuring only valid options can be selected in the browser
         *
         * @param array $colourOptionsValues
         * @param array $maps Array of maps containing colour name to ID mappings for tops, bases and metals, used for adding attachment IDs and URLs to the master list values
         * @return array $result 
         */
        public static function addMasterList($colourOptionsValues, $maps) {

            $data = [
                [
                    'type'       => 'Base Colours',
                    'size'       => 'homeportrait',
                    'thumb_size' => 'samplesthumb',
                    'key'        => 'base'
                ],
                [
                    'type'       => 'Metal Colours',
                    'size'       => 'gallery-thumb-landscape-sm',
                    'thumb_size' => 'gallery-thumb-landscape-sm',
                    'key'        => 'metal'
                ],
            ];

            // Array of options grouped by top type
            $groupedOptions = self::groupOptionsByTopType($colourOptionsValues);

            // Array to hold the final master list
            $result = [];

            foreach($data as $item) {

                // Get unique option values for each top type
                $uniqueValueGroups = self::getUniqueValues($groupedOptions, $item['type']);

                // Pick the correct map for this type
                $mapType = strtolower(str_replace(' ', '', $item['type'])); // e.g. 'basecolours' or 'metalcolours'
                $map = $maps[$mapType] ?? [];

                foreach($uniqueValueGroups as $topType => $colours) {
                    // Only loop if we have colours to process for this item type (base or metal)
                    if (empty(array_filter($colours, fn($v) => $v !== '' && $v !== null))) {
                        continue;
                    }

                    // Build associative array keyed by colour name
                    $newColours = [];

                    // Loop through values and replace with array containing name, ID and URL for image
                    foreach($colours as &$colour) {

                        // Ensure colour is in the correct format (lowercase, trimmed) to match the map keys
                        $colour = trim(strtolower($colour));
                        
                        if (isset($map[$colour])) {

                            // Set attachment ID from map
                            $attachment_id = $map[$colour]['id'] ?? null;

                            // Get image URL from attachment ID and specified size
                            $image = $attachment_id
                                ? wp_get_attachment_image_src($attachment_id, $item['size'], false)
                                : false;

                            $thumb = $attachment_id
                                ? wp_get_attachment_image_src($attachment_id, $item['thumb_size'], false)
                                : false;

                            // If item is base check if wood or tile and add to the correct array in the result
                            if($item['key'] === 'base') {
                                $baseType = in_array($colour, ['american walnut', 'jet black']) ? 'wood' : 'tile';
                                $newColours[$baseType][$colour] = [
                                    'name' => $colour,
                                    'slug' => str_replace(' ', '_', $colour),
                                    'id'   => $attachment_id,
                                    'sample_id' => $map[$colour]['sample_id'] ?? null,
                                    'url'  => $image[0] ?? null,
                                    'thumb_url' => $thumb[0] ?? null,
                                ];

                            } else {
                                
                                // Replace value with array containing name, ID and URL for image and colour as key
                                $newColours[$colour] = [
                                    'name' => $colour,
                                    'slug' => str_replace(' ', '_', $colour),
                                    'id'   => $attachment_id,
                                    'sample_id' => $map[$colour]['sample_id'] ?? null,
                                    'url'  => $image[0] ?? null,
                                    'thumb_url' => $thumb[0] ?? null,
                                ];

                            }
                        }
                    }

                    // Add the new colours array to the result under the correct top type and item key (base or metal)
                    $colours = $newColours ?? [];

                    // Set master list values for top type and colour type (base or metal)
                    if ($topType === 'slim/edge') {
                        $targets = ($item['type'] === 'Base Colours') ? ['slim', 'edge'] : ['edge'];
                        foreach ($targets as $target) {
                            $result[$target][$item['key']] = $colours;
                        }
                    } else {
                        $result[$topType][$item['key']] = $colours;
                    }
                }
            }

            // Return master data array containing unique values with IDs and URLs for each top type
            return $result;

        }

        /**
         * Group options by top type
         *
         * @param array $colourOptionsValues
         * @return array $grouped Array of options grouped by top type, with top type as key and array of options as value
         */
        public static function groupOptionsByTopType($colourOptionsValues) {

            $grouped = [];
        
            foreach ($colourOptionsValues as $row) {
                if (empty($row['Top Type'])) continue;
                $topType = strtolower(trim($row['Top Type']));
                
                if (!isset($grouped[$topType])) {
                    $grouped[$topType] = [];
                }
                $grouped[$topType][] = $row;
            }

            return $grouped;

        }

        /**
         * Get unique values for each top type
         *
         * @param array $groupedOptions
         * @param string $valueType
         * @return array
         */
        public static function getUniqueValues($groupedOptions, $valueType) {

            // Array to hold unique option values for each top type
            $optionValues = [];

            // Loop over grouped options and extract unique option values for each top type
            foreach($groupedOptions as $topType => $options) {

                // Loop through options for top type
                foreach($options as $option) {

                    // Convert comma-separated values into arrays and merge into existing values for this top type
                    $parts = array_map('trim', explode(',', $option[$valueType]));
                    $optionValues[$topType] = array_merge($optionValues[$topType] ?? [], $parts);

                }

                // Get unique values for this top type
                $optionValues[$topType] = array_unique($optionValues[$topType] ?? []);

                // Sort values alphabetically for easier use in popout drawers
                sort($optionValues[$topType]);

            }

            // Return the unique option values for each top type
            return $optionValues;

        }

        /**
         * Set horizontal bases data in correct format
         *
         * @param array $valuesRanges
         * @return array $result Array of horizontal bases with IDs and URLs for images, keyed by base colour name
         */
        public static function setHorizontalBases($valuesRanges) {

            // Get the colour options data from the relevant tab
            $horizontal_base_range = current(array_filter(
                $valuesRanges,
                fn($vr) => stripos($vr->getRange(), 'HorizontalBases') === 0
            ));

            // Extract values from the range, ensuring we have data and at least a header row
            $rows = $horizontal_base_range?->getValues() ?? [];

            // Extract header row from the first row of values
            $headers = $rows[0] ?? [];

            // Remove headers from rows data
            $horizontal_bases = array_slice($rows, 1);

            // Combine headers with row data to create associative array
            $horizontal_bases = array_map(function($row) use ($headers) {
                return array_combine($headers, $row);
            }, $horizontal_bases);

            // Return array of horizontal bases with IDs and URLs for images
            $result = [];

            // Loop through horizontal bases and build result array keyed by base colour name, with ID and URL for image
            foreach ($horizontal_bases as $base) {

                // Format base colour name
                $base_colour = trim(strtolower($base['Colour'] ?? ''));

                // Get image URL from attachment ID and specified size
                $image = $base['ID'] ? wp_get_attachment_image_src($base['ID'], 'homeportrait', false) : false;
                
                // Return result with name, ID, slug and URL for image
                $result[$base_colour] = [
                    'name' => $base_colour,
                    'slug' => str_replace(' ', '_', $base_colour),
                    'id'   => $base['ID'],
                    'url'  => $image[0] ?? null,
                ];
            }

            return $result;
        }

        /**
         * Process data value
         *
         * @param string $value
         * @return array
         */
        public static function convertToArray($value) {

            // Convert comma-separated values into an array, trimming whitespace and converting to lowercase
            return array_filter(array_map(fn($v) => strtolower(trim($v)), preg_split('/,\s*/', $value)));

        }

    }