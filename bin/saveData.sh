#!/bin/bash

curl -H "Content-Type: application/json" \
    -X PUT \
    --data-binary '@./organizations.json' \
    http://localhost:8080/services/api/french/organizations/data

#    http://localhost:9876/service/api/french/organizations/data