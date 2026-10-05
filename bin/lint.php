<?php
declare(strict_types=1);

$root = dirname(__DIR__);
$files = [];
foreach (['src', 'config', 'public', 'bin', 'tests'] as $directory) {
    $entries = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root . '/' . $directory, FilesystemIterator::SKIP_DOTS));
    foreach ($entries as $entry) {
        if ($entry->isFile() && $entry->getExtension() === 'php') {
            $files[] = $entry->getPathname();
        }
    }
}
sort($files);
$failed = 0;
foreach ($files as $file) {
    $process = proc_open([PHP_BINARY, '-l', $file], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    if (!is_resource($process)) {
        throw new RuntimeException('Cannot start PHP lint');
    }
    $output = stream_get_contents($pipes[1]) . stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    if (proc_close($process) !== 0) {
        $failed++;
        fwrite(STDERR, $output);
    }
}
printf("PHP lint: %d files, %d failures.\n", count($files), $failed);
exit($failed === 0 ? 0 : 1);
