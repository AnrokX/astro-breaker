import json
import math
import random
import os

def find_platforms(blocks):
    """Find distinct platforms in the map by grouping connected blocks at y=0"""
    platforms = []
    visited = set()
    
    def get_neighbors(x, z):
        return [(x+1,z), (x-1,z), (x,z+1), (x,z-1)]
    
    def flood_fill(start_x, start_z):
        platform = set()
        queue = [(start_x, start_z)]
        
        while queue:
            x, z = queue.pop(0)
            if (x, z) in visited:
                continue
                
            visited.add((x, z))
            platform.add((x, z))
            
            for nx, nz in get_neighbors(x, z):
                key = f"{nx},0,{nz}"
                if key in blocks and blocks[key] == 24 and (nx, nz) not in visited:
                    queue.append((nx, nz))
        
        return platform

    # Find all platforms using flood fill
    for coord in blocks:
        if blocks[coord] != 24:  # Only consider mossy cobblestone
            continue
        x, _, z = map(int, coord.split(','))
        if (x, z) not in visited:
            platform = flood_fill(x, z)
            if len(platform) > 50:  # Only consider large platforms
                platforms.append(platform)
    
    return platforms

def create_organic_platform_layer(center_x, center_z, radius):
    """Create an organic circular pattern for the platform's first layer"""
    layer_blocks = {}
    max_radius = radius + 2  # Slightly larger to create edge details
    
    # Create noise offsets for organic feel
    angles = [random.uniform(0, 2 * math.pi) for _ in range(8)]
    offsets = [random.uniform(0.8, 1.2) for _ in range(8)]
    
    def get_radius_offset(angle):
        # Interpolate between noise points for smooth variation
        total = 0
        weights = 0
        for i, (noise_angle, offset) in enumerate(zip(angles, offsets)):
            weight = 1 / (1 + abs(math.sin(angle - noise_angle)))
            total += offset * weight
            weights += weight
        return total / weights if weights > 0 else 1
    
    for x in range(-int(max_radius), int(max_radius) + 1):
        for z in range(-int(max_radius), int(max_radius) + 1):
            distance = math.sqrt(x*x + z*z)
            angle = math.atan2(z, x)
            radius_offset = get_radius_offset(angle)
            
            if distance <= radius * radius_offset:
                # Edge pattern
                if radius - 2 <= distance <= radius * radius_offset:
                    # Create a more detailed edge pattern
                    noise = math.sin(angle * 4) * 0.5 + math.cos(distance * 0.8) * 0.5
                    if noise > 0:
                        block_id = 37 if random.random() < 0.7 else 4  # Mix of stone and cobblestone
                    else:
                        block_id = 24  # Mossy cobblestone
                else:
                    # Interior is mostly plain with subtle variations
                    if random.random() < 0.9:
                        block_id = 24  # Mostly mossy cobblestone
                    else:
                        block_id = 37 if random.random() < 0.7 else 4
                
                key = f"{x + center_x},0,{z + center_z}"
                layer_blocks[key] = block_id
    
    return layer_blocks

def generate_hanging_cone(center_x, center_z, start_y=0, depth=30):
    print(f"Generating cone structure at ({center_x}, {center_z})...")
    cone_blocks = {}
    max_radius = 15  # Reduced radius for each platform
    
    # Create the decorative platform layer first
    platform_blocks = create_organic_platform_layer(center_x, center_z, max_radius)
    cone_blocks.update(platform_blocks)
    
    # Generate the hanging cone
    for y in range(1, depth):  # Start from 1 since we already did layer 0
        current_radius = max_radius * (1 - (y / depth) ** 0.7)
        
        # Show progress
        if y % 5 == 0:
            print(f"Processing layer {y}/{depth}...")
            
        for x in range(-int(current_radius), int(current_radius) + 1):
            for z in range(-int(current_radius), int(current_radius) + 1):
                distance = math.sqrt(x*x + z*z)
                if distance <= current_radius:
                    if distance > current_radius - 2 and random.random() < 0.4:
                        continue
                    
                    if random.random() < 0.6:
                        block_id = 37  # stone
                    elif random.random() < 0.3:
                        block_id = 24  # mossy cobblestone
                    else:
                        block_id = 4   # cobblestone
                    
                    key = f"{x + center_x},{-y},{z + center_z}"
                    cone_blocks[key] = block_id

    return cone_blocks

def main():
    try:
        # Check if map.json exists
        if not os.path.exists('map.json'):
            print("Error: map.json not found in current directory!")
            return

        print("Loading map.json...")
        with open('map.json', 'r') as f:
            map_data = json.load(f)

        # Find platforms
        print("Detecting platforms...")
        platforms = find_platforms(map_data['blocks'])
        print(f"Found {len(platforms)} platforms")

        all_cone_blocks = {}
        
        # Generate a cone for each platform
        for platform in platforms:
            # Calculate platform center
            xs = [x for x, _ in platform]
            zs = [z for _, z in platform]
            center_x = sum(xs) // len(xs)
            center_z = sum(zs) // len(zs)
            
            print(f"Platform center: ({center_x}, {center_z})")
            cone_blocks = generate_hanging_cone(center_x, center_z, start_y=0, depth=30)
            all_cone_blocks.update(cone_blocks)

        print("Adding new blocks to map...")
        blocks_added = 0
        for coord, block_id in all_cone_blocks.items():
            if coord not in map_data['blocks']:
                map_data['blocks'][coord] = block_id
                blocks_added += 1

        print(f"Saving updated map with {blocks_added} new blocks...")
        with open('map.json', 'w') as f:
            json.dump(map_data, f, indent=2)

        print("Done! Map has been updated successfully.")

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print("Please make sure map.json is in the same directory and is valid JSON.")

if __name__ == "__main__":
    main()