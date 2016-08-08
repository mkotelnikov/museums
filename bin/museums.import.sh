#!/bin/bash

cd `dirname $0`
dir=`pwd`

lang=french
baseUrl="http://localhost:9876/museums/$lang"

# Create "museums" collection
curl -H "Content-Type: application/json" -X PUT "$baseUrl/museums"

# Save data 
curl -H "Content-Type: application/json" -X PUT --data-binary "@$dir/museums.geo.json" "$baseUrl/museums/data"

# Create index
curl -H "Content-Type: application/json" -X PUT "$baseUrl/museums/index/q" -d '{"properties.name":2,"properties.description":1,"properties.tags":2}'
