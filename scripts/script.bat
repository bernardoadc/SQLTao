call defs.bat
node_modules\SchemaZen\SchemaZen.exe script --server %PROD_SERVER% --database %PROD_DB% --scriptDir SQLExportedDB --dataTables=%DATATABLES%
npm run generate