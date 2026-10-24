"""Zips a portal build folder for upload.

index.html sits at the root of the zip, paths use forward slashes, and every
sub-folder gets its own entry: some portals (GameMonetize) only create folders
that have an entry, and Windows' Compress-Archive leaves those out, which makes
the game stick on "Loading..." with 404s for everything in a sub-folder.

Usage: python tools/zip-portal.py <build folder> <file.zip>
"""
import os
import sys
import zipfile


def main(src, dest):
    if not os.path.isfile(os.path.join(src, "index.html")):
        sys.exit("no index.html in " + src)
    if os.path.exists(dest):
        os.remove(dest)
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as z:
        for folder, dirs, files in os.walk(src):
            dirs.sort()
            rel = os.path.relpath(folder, src).replace(os.sep, "/")
            if rel != ".":
                z.writestr(zipfile.ZipInfo(rel + "/"), "")  # explicit folder entry
            for name in sorted(files):
                arc = name if rel == "." else rel + "/" + name
                z.write(os.path.join(folder, name), arc)
    with zipfile.ZipFile(dest) as z:
        names = z.namelist()
    print(dest, "-", len(names), "entries:")
    for n in names:
        print("  " + n)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
