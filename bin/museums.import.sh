#!/bin/bash

cd `dirname $0`
dir=`pwd`

lang=french
baseUrl="http://localhost:9876/museums/$lang"

# Drop "museums" collection
curl -H "Content-Type: application/json" -X DELETE "$baseUrl/museums"

# Create "museums" collection
curl -H "Content-Type: application/json" -X PUT "$baseUrl/museums"

# Save data 
curl -H "Content-Type: application/json" -X PUT --data-binary "@$dir/museums-wikipedia.geo.json" "$baseUrl/museums/data"

# Drop index
curl -H "Content-Type: application/json" -X DELETE "$baseUrl/museums/index/q"

# Create index
curl -H "Content-Type: application/json" -X PUT "$baseUrl/museums/index/q" -d '{"properties.name":2,"properties.description":1,"properties.tags":2}'
