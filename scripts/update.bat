call defs.bat
node_modules\SchemaZen\SchemaZen.exe script --server %DEV_SERVER% --database %DEV_DB% --scriptDir SQLExportedDB --dataTables=%DATATABLES%
npm run generate
