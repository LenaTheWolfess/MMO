import os
import re
import sys
if sys.version_info.major == 3:
    pass
elif sys.version_info.major == 2:
    import struct


def version_to_uint32(version):
    if sys.version_info.major == 3:
        return version.to_bytes(4, byteorder='little')
    elif sys.version_info.major == 2:
        return struct.pack('<I', version)


def patch_deprecated_attributes(data):
    """ In A22 deprecated water parameters were removed. """
    """ https://trac.wildfiregames.com/changeset/19040 """
    fix_shininess = re.compile(r"<Shininess>\d+\.*\d*</Shininess>[\n\s]")
    match = fix_shininess.search(data)
    if match is not None:
        data = data.replace(match.group(0), "")

    fix_reflectionTint = re.compile(r"<ReflectionTint r=\"\d+\.*\d*\" g=\"\d+\.*\d*\" b=\"\d+\.*\d*\"/>[\n\s]")

    match = fix_reflectionTint.search(data)
    if match is not None:
        data = data.replace(match.group(0), "")

    fix_reflectionTintStrength = re.compile(r"<ReflectionTintStrength>\d+\.*\d*</ReflectionTintStrength>[\n\s]")

    match = fix_reflectionTintStrength.search(data)
    if match is not None:
        data = data.replace(match.group(0), "")

    fix_lightingModel = re.compile(r"<LightingModel>[A-Za-z]+</LightingModel>")
    match = fix_lightingModel.search(data)
    if match is not None:
        data = data.replace(match.group(0), "")

    return data

def patch_color_colour(data):
    """ In A19 colour was renamed to color. """
    return data.replace("colour", "color").replace("Colour", "Color")


def patch_height_data(f1, f2, number_of_tiles, function):
    for _ in range(0, number_of_tiles):
        height = int.from_bytes(f1.read(2), byteorder='little')
        f2.write((function(height)).to_bytes(2, byteorder='little'))


def patch_ambient_colors(data):
    """ In A24 the option to set a different unit and terrain color was removed. """
    """ https://code.wildfiregames.com/D3237 """
    """ https://code.wildfiregames.com/D3079 """
    """ https://code.wildfiregames.com/D3142 """
    """ https://code.wildfiregames.com/D3160 """
    fix_ambient_color = re.compile(
        r'<TerrainAmbientColor r="\d+\.*\d*" g="\d+\.*\d*" b="\d+\.*\d*"/>[\n\s].*<UnitsAmbientColor r="(\d+\.*\d*)" g="(\d+\.*\d*)" b="(\d+\.*\d*)"/>')
    ambient_match = fix_ambient_color.search(data)
    if not ambient_match:
        raise ValueError('TerrainAmbientColor not found: "{}"'.format(path))

    oldColor = ambient_match.group(0)
    r = ambient_match.group(1)
    g = ambient_match.group(2)
    b = ambient_match.group(3)
    return data.replace(
        oldColor, '<AmbientColor r="{}" g="{}" b="{}"/>'.format(r, g, b))


def convert_xml(path, new_version):
    re_version = re.compile(r'<Scenario version="(\d+)">')
    with open(path, 'rt') as handle:
        data = handle.read()
    match = re_version.search(data)
    if not match:
        raise ValueError('Version not found: "{}"'.format(path))
    old_version = match.group(0)
    data = data.replace(
        old_version, '<Scenario version="{}">'.format(new_version))


    old_version_int = int(match.group(1))
    if old_version_int < 6 and new_version >= 6:
        data = patch_color_colour(data)
        data = patch_deprecated_attributes(data)

    if old_version_int < 7 and new_version >= 7:
       data = patch_ambient_colors(data)

    with open(path, 'wt') as handle:
        handle.write(data)
        sys.stdout.write(
            'File "{}" converted from version "{}" to "{}" version.\n'.format(path, match.group(1), new_version))


def convert_pmp(path, new_version):
    with open(path, "rb") as f1, open(path + "~", "wb") as f2:
        # 4 bytes PSMP to start the file
        f2.write(f1.read(4))
        # 4 bytes to encode the version of the file format
        version = int.from_bytes(f1.read(4), byteorder='little')
        f2.write((new_version).to_bytes(4, byteorder='little'))
        # 4 bytes a for file size (which shouldn't change)
        f2.write(f1.read(4))
        # 4 bytes to encode the map size
        map_size = int.from_bytes(f1.read(4), byteorder='little')
        f2.write(map_size.to_bytes(4, byteorder='little'))

        if version == 5 and new_version <= 6:
            def height_transform(h):
                return h >> 3
        else:
            def height_transform(h):
                return h

        patch_height_data(f1, f2, (map_size*16+1) *
                          (map_size*16+1), height_transform)

        # copy the rest of the file
        byte = f1.read(1)
        while byte != b"":
            f2.write(byte)
            byte = f1.read(1)
        f2.close()
        f1.close()
        print('File "{}" converted from version "{}" to "{}" version.\n'.format(path, version, new_version))


    # replace the old file, comment to see both files
    os.remove(path)
    os.rename(path + "~", path)


def convert_file(path, new_version):
    _ , ext = os.path.splitext(path)
    if ext == '.xml':
        convert_xml(path, new_version)
    elif ext == '.pmp':
        convert_pmp(path, new_version)
    else:
        # Ignore other extensions
        pass


if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.stderr.write('Usage: {} newversion paths...\n'.format(__file__))
        exit(1)

    new_version = int(sys.argv[1])
    if new_version < 1 or new_version >= 2**32:
        sys.stderr.write('Incorrect version: "{}"\n'.format(new_version))
        exit(1)
    paths = sys.argv[2:]
    for path in paths:
        print(path)
        if os.path.isfile(path):
            convert_file(path, new_version)
        elif os.path.isdir(path):
            for name in os.listdir(path):
                file_path = os.path.join(path, name)
                if os.path.isfile(file_path):
                    convert_file(file_path, new_version)
        else:
            sys.stderr.write('Unknown path: "{}"\n'.format(path))