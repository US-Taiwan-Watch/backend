. ./.azure_pat
B64_PAT=$(printf "%s"":$AZURE_PAT" | base64)
curl "https://dev.azure.com/ustw/US%20Taiwan%20Watch/_apis/git/repositories/secret-credentials/items?path=/backend-env&api-version=6.0" --header "Authorization: Basic $B64_PAT"
