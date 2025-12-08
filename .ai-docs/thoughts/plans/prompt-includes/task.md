We want to add in generic prompt inclusion functionality. The way it should work is that
the orchestrate.md or workflow md files can contain strings like "@my-file.md" or
"@../other-file.md" or "@mydir/myfile.md" (with or without quotes), and these strings
should be replaced precisely with the contents of the file at the referenced path

these paths should be evaluated relative to the file being read (e.g. orchestrate.md)

if the referenced path does not exist, a hard error should be thrown, and shown in the UI;
 this kind of error should kill the current ralph process; the user should be able to
correct the file and then "s" to start a new session without reloading ralph (prompt files
 should always be read live from disk, not cached in memory)
