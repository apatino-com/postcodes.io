Lookup a terminated postcode.

If the terminated postcode exists, this API returns the year and month of termination plus its last known WGS84 coordinates. Channel Islands and Isle of Man postcodes do not carry coordinates — `longitude` and `latitude` will be `null` for those.

Returns `404` if the postcode does not exist in our database of terminated postcodes or is not valid.

Source: ONS Postcode Directory (ONSPD). Live and terminated postcodes share the same underlying table; a postcode is terminated when `date_of_termination` is set.
